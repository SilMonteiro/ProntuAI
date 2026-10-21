import pytest
from fastapi.testclient import TestClient

import app.recepcao as recepcao
from app.main import app

client = TestClient(app)

PACIENTE = {
    "nome": "Maria da Silva",
    "data_nascimento": "1980-05-12",
    "sexo": "Feminino",
    "cpf": "529.982.247-25",
    "telefone": "(11) 99999-0000",
    "convenio": "Particular",
}


@pytest.fixture(autouse=True)
def tmp_data(tmp_path, monkeypatch):
    monkeypatch.setattr(recepcao, "DATA_DIR", tmp_path)
    monkeypatch.setattr(recepcao, "PACIENTES_FILE", tmp_path / "pacientes.json")
    monkeypatch.setattr(recepcao, "FILA_FILE", tmp_path / "fila.json")


def _cadastrar(**over):
    return client.post("/api/recepcao/pacientes", json={**PACIENTE, **over})


def test_cadastra_e_busca_por_nome_sem_acento_e_cpf():
    created = _cadastrar()
    assert created.status_code == 201
    assert created.json()["cpf"] == "52998224725"
    assert created.json()["prontuario"] == 1001
    assert client.get("/api/recepcao/pacientes", params={"q": "MARIA"}).json()[0]["nome"] == "Maria da Silva"
    assert len(client.get("/api/recepcao/pacientes", params={"q": "529.982"}).json()) == 1
    assert client.get("/api/recepcao/pacientes", params={"q": "joao"}).json() == []


def test_rejeita_cpf_invalido_e_duplicado():
    assert _cadastrar(cpf="111.111.111-11").status_code == 422
    assert _cadastrar().status_code == 201
    assert _cadastrar(nome="Outra Pessoa").status_code == 409


def test_fila_ordena_por_prioridade_e_chegada_e_evita_duplicidade():
    a = _cadastrar().json()
    b = _cadastrar(nome="José Pereira", cpf="168.995.350-09").json()
    c = _cadastrar(nome="Ana Souza", cpf="111.444.777-35").json()

    assert client.post("/api/recepcao/fila", json={"paciente_id": a["id"]}).status_code == 201
    assert client.post("/api/recepcao/fila", json={"paciente_id": a["id"]}).status_code == 409
    client.post("/api/recepcao/fila", json={"paciente_id": b["id"]})
    client.post("/api/recepcao/fila", json={"paciente_id": c["id"], "prioridade": "preferencial"})

    fila = client.get("/api/recepcao/fila").json()
    assert [f["nome"] for f in fila] == ["Ana Souza", "Maria da Silva", "José Pereira"]

    assert client.delete(f"/api/recepcao/fila/{fila[0]['id']}").status_code == 204
    assert client.delete(f"/api/recepcao/fila/{fila[0]['id']}").status_code == 404
    assert len(client.get("/api/recepcao/fila").json()) == 2


def test_fila_com_paciente_inexistente():
    assert client.post("/api/recepcao/fila", json={"paciente_id": "nope"}).status_code == 404
