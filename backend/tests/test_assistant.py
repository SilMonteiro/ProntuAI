import copy
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.assistant as assistant
import app.main as main

client = TestClient(main.app)


def base_draft() -> dict:
    return {
        "status": "EmRevisao",
        "ident": {"nome": "Maria", "idade": "47 anos", "dataHora": "18/10/2026 10:00"},
        "s": {
            "qp": "Pirose há 2 meses.",
            "hma": "Pirose pós-prandial.",
            "hist": "Não mencionado",
            "alergias": "Dipirona.",
            "meds": "Losartana 50 mg.",
            "habitos": "Nega tabagismo.",
        },
        "o": {"sinais": "PA 130x85", "exame": "Abdome flácido.", "comp": "Nenhum exame apresentado"},
        "a": {
            "hip": "DRGE.",
            "cids": [
                {"id": "cid1", "code": "K21.9", "desc": "DRGE sem esofagite", "quote": "“…queimação…”", "segs": [6], "status": "Sugerida"},
                {"id": "cid2", "code": "I10", "desc": "Hipertensão", "quote": "“…pressão…”", "segs": [10], "status": "Sugerida"},
            ],
        },
        "p": {
            "rx": [{"id": "rx1", "med": "Omeprazol 40 mg", "pos": "1 comp. em jejum."}],
            "exames": [],
            "orient": "Elevar a cabeceira da cama.",
        },
    }


def fake_client(output: dict, reply: str = "Feito.", capture: list | None = None):
    async def parse(**kwargs):
        if capture is not None:
            capture.append(kwargs)
        parsed = assistant.AssistantOutput(reply=reply, draft=assistant.Rascunho(**output))
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))])

    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))


def post(draft, message="ajuste", client_obj=None, monkeypatch=None):
    if monkeypatch is not None and client_obj is not None:
        monkeypatch.setattr(assistant, "get_client", lambda: client_obj)
    return client.post("/api/assistant/chat", json={"draft": draft, "message": message, "history": [], "transcript": []})


def test_returns_503_without_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    response = post(base_draft())
    assert response.status_code == 503


def test_rejects_empty_message(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    response = post(base_draft(), message="")
    assert response.status_code == 422


def test_applies_requested_change_and_reports_section(monkeypatch):
    draft = base_draft()
    proposed = copy.deepcopy(draft)
    proposed["p"]["orient"] = "Elevar a cabeceira da cama. Retorno em 15 dias."
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    response = post(draft, "retorno em 15 dias", fake_client(proposed, "Ajustei o retorno."), monkeypatch)

    assert response.status_code == 200
    body = response.json()
    assert body["reply"] == "Ajustei o retorno."
    assert body["changed_paths"] == ["p.orient"]
    assert "15 dias" in body["draft"]["p"]["orient"]
    assert body["log"]


def test_restores_identification_and_cid_evidence(monkeypatch):
    draft = base_draft()
    proposed = copy.deepcopy(draft)
    proposed["ident"]["nome"] = "Outra pessoa"
    proposed["a"]["cids"][0]["quote"] = "texto inventado"
    proposed["a"]["cids"][0]["code"] = "X99"
    proposed["a"]["cids"][0]["status"] = "Aceita"
    proposed["a"]["cids"].append({"id": "novo", "code": "A00", "desc": "Inventado", "quote": "", "segs": [], "status": "Sugerida"})
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    body = post(draft, "aceite o primeiro CID", fake_client(proposed), monkeypatch).json()

    assert body["draft"]["ident"]["nome"] == "Maria"
    cids = body["draft"]["a"]["cids"]
    assert [c["id"] for c in cids] == ["cid1", "cid2"]
    assert cids[0]["code"] == "K21.9"
    assert cids[0]["quote"] == "“…queimação…”"
    assert cids[0]["status"] == "Aceita"
    assert body["changed_paths"] == ["a.cids"]


def test_question_keeps_draft_unchanged(monkeypatch):
    draft = base_draft()
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")

    body = post(draft, "por que K21.9?", fake_client(draft, "Há três evidências."), monkeypatch).json()

    assert body["changed_paths"] == []
    assert body["log"] is None
    assert body["reply"] == "Há três evidências."


def test_sends_transcript_and_history_as_untrusted_context(monkeypatch):
    captured: list = []
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    payload = {
        "draft": base_draft(),
        "message": "resuma a HDA",
        "history": [{"role": "user", "text": "oi"}, {"role": "ai", "text": "olá"}],
        "transcript": [{"role": "paciente", "text": "Queimação há 2 meses."}],
    }
    monkeypatch.setattr(assistant, "get_client", lambda: fake_client(base_draft(), capture=captured))

    response = client.post("/api/assistant/chat", json=payload)

    assert response.status_code == 200
    messages = captured[0]["messages"]
    assert messages[0]["role"] == "system"
    assert "Queimação há 2 meses." in messages[1]["content"]
    assert "resuma a HDA" in messages[1]["content"]
    assert captured[0]["model"] == "gpt-4o-mini"


def test_returns_502_when_model_fails(monkeypatch):
    async def boom(**kwargs):
        raise RuntimeError("timeout")

    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    failing = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=boom)))

    response = post(base_draft(), "qualquer", failing, monkeypatch)

    assert response.status_code == 502


def test_changed_sections_groups_list_items():
    before = {"p": {"rx": [{"id": "a", "med": "X"}]}, "s": {"qp": "1"}}
    after = {"p": {"rx": [{"id": "a", "med": "Y"}]}, "s": {"qp": "1"}}
    assert assistant.changed_sections(before, after) == ["p.rx"]
