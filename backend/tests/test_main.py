import asyncio
from types import SimpleNamespace

from fastapi.testclient import TestClient

import app.main as main
from app.main import seconds_to_milliseconds, serialize_transcription


async def _fake_role_parse(**kwargs):
    parsed = main.ConversationRoles(
        speakers=[
            main.SpeakerRole(speaker="A", role="medico"),
            main.SpeakerRole(speaker="B", role="paciente"),
        ]
    )
    return SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(parsed=parsed))])


def _fake_client(transcriptions):
    return SimpleNamespace(
        audio=SimpleNamespace(transcriptions=transcriptions),
        chat=SimpleNamespace(completions=SimpleNamespace(parse=_fake_role_parse)),
    )


def test_seconds_to_milliseconds_rounds_value():
    assert seconds_to_milliseconds(1.2346) == 1235


def test_serialize_transcription_maps_speaker_and_timestamps():
    result = serialize_transcription(
        SimpleNamespace(
            text="Olá. Tudo bem?",
            segments=[
                SimpleNamespace(speaker="A", start=0.125, end=1.5, text=" Olá. "),
                SimpleNamespace(speaker="B", start=1.55, end=2.75, text="Tudo bem?"),
            ],
        )
    )
    assert result == {
        "text": "Olá. Tudo bem?",
        "segments": [
            {"speaker": "A", "start_ms": 125, "end_ms": 1500, "text": "Olá."},
            {"speaker": "B", "start_ms": 1550, "end_ms": 2750, "text": "Tudo bem?"},
        ],
    }


def test_transcribes_and_assigns_roles(monkeypatch, tmp_path):
    class FakeTranscriptions:
        async def create(self, **kwargs):
            assert kwargs["file"][2] == "audio/webm"
            assert kwargs["language"] == "pt"
            return SimpleNamespace(
                text="O que sente? Dor de cabeça.",
                segments=[
                    SimpleNamespace(speaker="A", start=0, end=1.2, text="O que sente?"),
                    SimpleNamespace(speaker="B", start=1.4, end=2.6, text="Dor de cabeça."),
                ],
            )

    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    monkeypatch.setattr(main, "TRANSCRIPTIONS_DIR", tmp_path)
    monkeypatch.setattr(main, "AsyncOpenAI", lambda: _fake_client(FakeTranscriptions()))

    response = TestClient(main.app).post(
        "/api/transcriptions",
        files={"audio": ("gravacao.webm", b"audio", "audio/webm;codecs=opus")},
    )

    assert response.status_code == 200
    body = response.json()
    assert [s["role"] for s in body["segments"]] == ["medico", "paciente"]
    assert body["download_url"].startswith("/api/transcriptions/")
    assert len(list(tmp_path.glob("*.json"))) == 1


def test_accepts_supported_extension_when_browser_sends_generic_mime(monkeypatch, tmp_path):
    class FakeTranscriptions:
        async def create(self, **kwargs):
            assert kwargs["file"][2] == "audio/m4a"
            return SimpleNamespace(text="Olá", segments=[])

    monkeypatch.setenv("OPENAI_API_KEY", "test-only")
    monkeypatch.setattr(main, "TRANSCRIPTIONS_DIR", tmp_path)
    monkeypatch.setattr(main, "AsyncOpenAI", lambda: _fake_client(FakeTranscriptions()))

    response = TestClient(main.app).post(
        "/api/transcriptions",
        files={"audio": ("consulta.m4a", b"audio", "application/octet-stream")},
    )
    assert response.status_code == 200


def test_rejects_unsupported_format():
    response = TestClient(main.app).post(
        "/api/transcriptions",
        files={"audio": ("nota.txt", b"texto", "text/plain")},
    )
    assert response.status_code == 415


def test_rejects_empty_audio():
    response = TestClient(main.app).post(
        "/api/transcriptions",
        files={"audio": ("gravacao.webm", b"", "audio/webm")},
    )
    assert response.status_code == 400


def test_classify_speakers_uses_conversation_context():
    client = SimpleNamespace(chat=SimpleNamespace(completions=SimpleNamespace(parse=_fake_role_parse)))
    result = asyncio.run(
        main.classify_speakers(
            client,
            [
                {"speaker": "A", "text": "O que a senhora está sentindo?"},
                {"speaker": "B", "text": "Dor no estômago."},
            ],
        )
    )
    assert result == {"A": "medico", "B": "paciente"}
