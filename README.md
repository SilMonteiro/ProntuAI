# ProntuAI

MVP de hackathon: o médico grava a consulta, recebe a transcrição, a IA gera o rascunho SOAP e o médico revisa (com chat) e homologa.

```
frontend/  React + Vite — tela do médico (porta 5180)
backend/   FastAPI — gravação/transcrição real via OpenAI (porta 8000)
```

## Backend (transcrição real)

Adaptado do projeto `transcritor-audio`. Recebe o áudio, transcreve em português com
diarização (`gpt-4o-transcribe-diarize`) e classifica cada voz como médico ou paciente (`gpt-4o-mini`).

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env   # preencha OPENAI_API_KEY
python -m uvicorn app.main:app --port 8000 --reload
python -m pytest -q           # testes
```

| Rota | Descrição |
| --- | --- |
| `GET /health` | Status e se a chave da OpenAI está configurada |
| `POST /api/transcriptions` | Campo `audio` (multipart, até 25 MB; webm, ogg, mp3, m4a, wav, flac, mp4) |
| `GET /api/transcriptions/{id}` | Baixa o JSON salvo em `backend/data/transcriptions/` |
| `POST /api/assistant/chat` | Assistente de IA (`CHAT_MODEL`, padrão `gpt-4o-mini`): recebe o rascunho, o histórico e a transcrição, e devolve a resposta e o rascunho revisado. Dados de identificação e evidências dos CIDs são preservados pelo servidor. |

## Frontend

```powershell
cd frontend
npm install
npm run dev     # http://127.0.0.1:5180  (o /api é encaminhado ao backend)
```

### Modos de gravação
- **Microfone real** (padrão): grava pelo navegador, envia ao backend ao parar e mostra a transcrição com médico/paciente. Também aceita envio de arquivo de áudio.
- **Consulta simulada**: reproduz a consulta mockada (Maria Aparecida Souza), sem backend — útil como plano B na apresentação.

> O chat usa o assistente GPT do backend (`/api/assistant/chat`). Se ele estiver indisponível, o chat avisa e responde com regras locais. O rascunho SOAP inicial ainda é de exemplo.

### Roteiro da demo
1. **Iniciar gravação** → **Parar gravação** (ou envie um arquivo).
2. **Gerar prontuário com IA**.
3. Revise o rascunho SOAP, decida os CIDs e trate o alerta de alergia (ex.: chat "Substitua a dipirona por paracetamol 750 mg").
4. Marque a revisão e clique em **Elaborar prontuário** → versão final A4 com botão de impressão.

Regras da proposta cobertas: REG-01 (human-in-the-loop), REG-02 (fidelidade), REG-03 (amenidades), REG-04 (tradução), REG-05 (CID com evidência), REG-06 (alerta de alergia).

> Protótipo: o áudio é enviado à OpenAI. Não use dados reais de pacientes em demonstrações.
