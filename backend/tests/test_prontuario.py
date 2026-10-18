from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.assistant as assistant
import app.main as main
import app.prontuario as prontuario

client = TestClient(main.app)

TRANSCRIPT = [
    {"id": 1, "role": "medico", "text": "Bom dia! Viu o jogo ontem?"},
    {"id": 2, "role": "paciente", "text": "Doutor, estou com uma dor de cabeça latejando há três dias."},
    {"id": 3, "role": "medico", "text": "Pressão doze por oito. Hipótese de enxaqueca. Vou receitar dipirona."},
    {"id": 4, "role": "paciente", "text": "Sou alérgico a dipirona."},
]


def payload():
    return {
        "patient": {"nome": "João Pedro Almeida", "idade": "52 anos", "sexo": "Masculino"},
        "data_hora": "18/10/2026 10:00",
        "transcript": TRANSCRIPT,
    }


def model_output(**over):
    data = {
        "s": {
            "qp": "Cefaleia pulsátil há 3 dias.",
            "hma": "Cefaleia pulsátil com início há 3 dias.",
            "hist": "",
            "alergias": "Dipirona.",
            "meds": "",
            "habitos": "",
        },
        "o": {"sinais": "PA 120 x 80 mmHg.", "exame": "", "comp": ""},
        "hipotese": "Enxaqueca.",
        "cids": [
            {"code": "g43.9", "desc": "Enxaqueca, não especificada", "quote": "“Hipótese de enxaqueca.”", "segs": [3]},
            {"code": "R51", "desc": "Cefaleia", "quote": "inventado", "segs": [99]},
        ],
        "prescricao": [{"med": "Dipirona", "pos": "(dose não mencionada na transcrição)"}],
        "exames": [],
        "orientacoes": "",
        "evidencias": [
            {"field": "s.qp", "segs": [2]},
            {"field": "a.hip", "segs": [3, 42]},
            {"field": "o.exame", "segs": [77]},
        ],
        "segmentos": [
            {"id": 1, "clinical": False, "terms": []},
            {"id": 2, "clinical": True, "terms": [
                {"raw": "dor de cabeça latejando", "med": "cefaleia pulsátil"},
                {"raw": "texto que não existe", "med": "x"},
                {"raw": "três dias", "med": "Três dias"},
            ]},
            {"id": 3, "clinical": False, "terms": []},
        ],
    }
    data.update(over)
    return prontuario.ProntuarioOut(**data)


def fake_client(output, capture=None):
    async def parse(**kwargs):
        if capture is not None:
            capture.append(kwargs)
        return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=output))])

    return SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=parse)))


def test_returns_503_without_api_key(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    assert client.post("/api/prontuario/gerar", json=payload()).status_code == 503


def test_rejects_empty_transcript(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    body = payload()
    body["transcript"] = []
    assert client.post("/api/prontuario/gerar", json=body).status_code == 422


def test_builds_draft_with_fidelity_rules(monkeypatch):
    captured: list = []
    monkeypatch.setattr(assistant, "get_client", lambda: fake_client(model_output(), captured))
    monkeypatch.setattr(prontuario, "get_client", lambda: fake_client(model_output(), captured))

    response = client.post("/api/prontuario/gerar", json=payload())

    assert response.status_code == 200
    body = response.json()
    draft = body["draft"]
    # Identificação vem do sistema, não do modelo
    assert draft["ident"] == {"nome": "João Pedro Almeida", "idade": "52 anos", "dataHora": "18/10/2026 10:00"}
    assert draft["status"] == "Rascunho"
    # Campos vazios recebem o texto padrão da Regra de Fidelidade
    assert draft["s"]["meds"] == "Nenhum informado"
    assert draft["o"]["exame"] == "Exame físico não descrito na transcrição"
    assert draft["p"]["orient"] == "Não mencionado na transcrição"
    # CID sem evidência válida é descartado; o código é normalizado
    assert [c["code"] for c in draft["a"]["cids"]] == ["G43.9"]
    assert draft["a"]["cids"][0]["status"] == "Sugerida"
    # Prescrição é mantida como dita (o alerta de alergia é calculado no frontend)
    assert draft["p"]["rx"][0]["med"] == "Dipirona"
    # Evidências só com ids existentes
    assert body["evidence"] == {"s.qp": [2], "a.hip": [3]}
    # Uma entrada por fala; amenidade marcada; termo inexistente descartado
    segs = {s["id"]: s for s in body["segments"]}
    assert set(segs) == {1, 2, 3, 4}
    assert segs[1]["clinical"] is False
    assert segs[4]["clinical"] is True
    # Fala citada como evidência (hipótese e CID) é sempre clínica, mesmo que o modelo erre
    assert segs[3]["clinical"] is True
    assert segs[2]["terms"] == [{"raw": "dor de cabeça latejando", "med": "cefaleia pulsátil"}]
    assert body["stats"] == {"filtrados": 1, "termos": 1}
    # Prompt inclui ids das falas e o modelo configurado
    content = captured[0]["messages"][1]["content"]
    assert "[2] Paciente: Doutor, estou com uma dor de cabeça latejando" in content
    assert captured[0]["model"] == "gpt-4o-mini"


def test_returns_502_when_model_fails(monkeypatch):
    async def boom(**kwargs):
        raise RuntimeError("timeout")

    failing = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=boom)))
    monkeypatch.setattr(prontuario, "get_client", lambda: failing)

    assert client.post("/api/prontuario/gerar", json=payload()).status_code == 502
