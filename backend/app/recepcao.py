"""Recepção da clínica: cadastro de pacientes e fila de espera para o médico.

Persistência em arquivos JSON (data/recepcao/), sem banco de dados.
"""
from __future__ import annotations

import json
import re
import threading
import unicodedata
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator

router = APIRouter(prefix="/api/recepcao", tags=["recepção"])

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "recepcao"
PACIENTES_FILE = DATA_DIR / "pacientes.json"
FILA_FILE = DATA_DIR / "fila.json"
_lock = threading.Lock()

Prioridade = Literal["normal", "preferencial", "urgente"]
PRIORIDADE_ORDEM = {"urgente": 0, "preferencial": 1, "normal": 2}


def _read(path: Path) -> list[dict]:
    if not path.is_file():
        return []
    return json.loads(path.read_text(encoding="utf-8"))


def _write(path: Path, items: list[dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(path)


def _normalize(text: str) -> str:
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in decomposed if not unicodedata.combining(c))


def _valid_cpf(digits: str) -> bool:
    if len(digits) != 11 or digits == digits[0] * 11:
        return False
    for size in (9, 10):
        total = sum(int(d) * w for d, w in zip(digits[:size], range(size + 1, 1, -1)))
        if int(digits[size]) != (total * 10 % 11) % 10:
            return False
    return True


class PacienteIn(BaseModel):
    nome: str = Field(min_length=3, max_length=120)
    data_nascimento: date
    sexo: Literal["Feminino", "Masculino", "Outro"]
    cpf: str
    telefone: str = Field(default="", max_length=20)
    convenio: str = Field(default="Particular", max_length=60)

    @field_validator("nome", "convenio")
    @classmethod
    def _strip(cls, value: str) -> str:
        return " ".join(value.split())

    @field_validator("cpf")
    @classmethod
    def _cpf(cls, value: str) -> str:
        digits = re.sub(r"\D", "", value)
        if not _valid_cpf(digits):
            raise ValueError("CPF inválido.")
        return digits

    @field_validator("data_nascimento")
    @classmethod
    def _nascimento(cls, value: date) -> date:
        if value > date.today() or value.year < 1900:
            raise ValueError("Data de nascimento inválida.")
        return value


class Paciente(PacienteIn):
    id: str
    prontuario: int
    cadastrado_em: str


class FilaIn(BaseModel):
    paciente_id: str
    prioridade: Prioridade = "normal"


class FilaItem(BaseModel):
    id: str
    paciente_id: str
    nome: str
    prioridade: Prioridade
    status: Literal["aguardando"] = "aguardando"
    chegada: str


@router.get("/pacientes", response_model=list[Paciente])
def buscar_pacientes(q: str = "") -> list[dict]:
    with _lock:
        pacientes = _read(PACIENTES_FILE)
    termo = _normalize(q.strip())
    if not termo:
        return sorted(pacientes, key=lambda p: _normalize(p["nome"]))[:50]
    digitos = re.sub(r"\D", "", q)
    achados = [
        p
        for p in pacientes
        if termo in _normalize(p["nome"]) or (digitos and digitos in p["cpf"])
    ]
    return sorted(achados, key=lambda p: _normalize(p["nome"]))[:50]


@router.post("/pacientes", response_model=Paciente, status_code=201)
def cadastrar_paciente(body: PacienteIn) -> dict:
    with _lock:
        pacientes = _read(PACIENTES_FILE)
        if any(p["cpf"] == body.cpf for p in pacientes):
            raise HTTPException(status_code=409, detail="Já existe um paciente cadastrado com este CPF.")
        paciente = {
            **body.model_dump(mode="json"),
            "id": uuid4().hex,
            "prontuario": max((p["prontuario"] for p in pacientes), default=1000) + 1,
            "cadastrado_em": datetime.now(timezone.utc).isoformat(),
        }
        pacientes.append(paciente)
        _write(PACIENTES_FILE, pacientes)
    return paciente


@router.get("/fila", response_model=list[FilaItem])
def listar_fila() -> list[dict]:
    with _lock:
        fila = _read(FILA_FILE)
    return sorted(fila, key=lambda f: (PRIORIDADE_ORDEM[f["prioridade"]], f["chegada"]))


@router.post("/fila", response_model=FilaItem, status_code=201)
def entrar_na_fila(body: FilaIn) -> dict:
    with _lock:
        paciente = next((p for p in _read(PACIENTES_FILE) if p["id"] == body.paciente_id), None)
        if paciente is None:
            raise HTTPException(status_code=404, detail="Paciente não encontrado.")
        fila = _read(FILA_FILE)
        if any(f["paciente_id"] == paciente["id"] for f in fila):
            raise HTTPException(status_code=409, detail="Este paciente já está na fila de espera.")
        item = {
            "id": uuid4().hex,
            "paciente_id": paciente["id"],
            "nome": paciente["nome"],
            "prioridade": body.prioridade,
            "status": "aguardando",
            "chegada": datetime.now(timezone.utc).isoformat(),
        }
        fila.append(item)
        _write(FILA_FILE, fila)
    return item


@router.delete("/fila/{item_id}", status_code=204)
def sair_da_fila(item_id: str) -> None:
    with _lock:
        fila = _read(FILA_FILE)
        restante = [f for f in fila if f["id"] != item_id]
        if len(restante) == len(fila):
            raise HTTPException(status_code=404, detail="Item não encontrado na fila.")
        _write(FILA_FILE, restante)
