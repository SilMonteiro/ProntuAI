# ProntuAI

MVP de hackathon: o médico grava a consulta, recebe a transcrição, a IA gera o rascunho SOAP e o médico revisa (com chat para ajustes) e homologa.

```
frontend/  React + Vite — tela do médico
backend/   FastAPI — gravação/transcrição real via OpenAI
```

### Resumo do funcionamento

O texto transcrito é enviado como conteúdo de entrada (user message) em uma chamada de API para o modelo de linguagem.

A requisição envia também um System Prompt *rigoroso* contendo as diretrizes médicas (formato SOAP, tradução de termos informais para terminologia técnica correta e regras de zero alucinação para dados ausentes). A IA retorna o prontuário limpo e perfeitamente estruturado em formato JSON ou Markdown pronto para exibição na tela.


### Modos de gravação
- **Microfone real** (padrão): grava pelo navegador, envia ao backend ao parar e mostra a transcrição com médico/paciente. Também aceita envio de arquivo de áudio.
- **Consulta simulada**: reproduz a consulta mockada (Maria Aparecida Souza), sem backend — útil como plano B na apresentação.

> O chat usa o assistente GPT do backend (`/api/assistant/chat`). Se ele estiver indisponível, o chat avisa e responde com regras locais. O rascunho SOAP inicial ainda é de exemplo.


### Roteiro para DEMO

Tela Mockada para Teste → usuário: **Maria Aparecida Souza**

A tela mockada utiliza dados estáticos, transcrições fictícias pré-gravadas ou objetos de exemplo armazenados no próprio código.

Ela ermite que desenvolvedores e avaliadores testem a interface gráfica (UI) e o layout de exibição do prontuário (Subjetivo, Objetivo, Avaliação e Plano) instantaneamente, **sem precisar gravar áudios reais ou gastar créditos com chamadas de API externas.** É ideal para validar o design e o comportamento visual do frontend de forma rápida e segura.

1. Selecione **consulta simulada**
2. **Iniciar gravação** → **Parar gravação**.
3. **Gerar prontuário com IA**.
4. Revise o rascunho SOAP, decida os CIDs e trate o alerta de alergia (ex.: chat "Substitua a dipirona por paracetamol 750 mg").
4. Marque a revisão e clique em **Elaborar prontuário** → versão final A4 com botão de impressão.

Regras da proposta cobertas: REG-01 (human-in-the-loop), REG-02 (fidelidade), REG-03 (amenidades), REG-04 (tradução), REG-05 (CID com evidência), REG-06 (alerta de alergia).



### FUNCIONAMENTO REAL COM PROCESSAMENTO DE IA

Tela com Funcionamento Real → Usuário: **João Pedro Almeida**

Diferente da versão mockada, esta tela lida com o fluxo operacional real. No cenário do paciente João, o sistema processa um caso clínico verídico — seja por meio da gravação de áudio do microfone em tempo real ou pelo upload de um arquivo de áudio da consulta.

> Protótipo: o áudio é enviado à OpenAI. Não use dados reais de pacientes, utilize de preferência um áudio gravado por si mesmo.

Fluxo resumido: O áudio capturado é enviado para o backend, passa pelo motor de transcrição e em seguida é processado pela inteligência artificial aplicando as regras estritas da skill do ProntuAI (garantindo fidelidade aos fatos relatados e estruturação SOAP sem alucinações).


## Backend (transcrição)

Adaptado do projeto `transcritor-audio`. Recebe o áudio, transcreve em português com
diarização (`gpt-4o-transcribe-diarize`) e classifica cada voz como médico ou paciente (`gpt-4o-mini`).

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
Copy-Item .env.example .env   # Aqui você preenche com a OPENAI_API_KEY
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


### Uso Atual da OpenAI e Adaptação para Outras IAs

Atualmente, o projeto foi implementado utilizando nativamente a infraestrutura, os SDKs e os modelos da OpenAI.

**Intenção de Evolução:** A arquitetura do código está sendo preparada para ser agnóstica a provedores de IA. Como grande parte das APIs modernas de mercado adota o mesmo padrão de requisição compatível com o formato OpenAI (utilizando parâmetros de Base URL e chaves de API flexíveis), a intenção é desacoplar o código para suportar facilmente outras IAs de alta performance (como DeepSeek, Claude ou modelos locais/alternativos), permitindo alternar o motor de inteligência artificial de acordo com a necessidade ou custo/benefício do projeto.
