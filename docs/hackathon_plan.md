# 📋 Plano de Desenvolvimento – Hackathon 15h (3 pessoas)

## 🎯 Objetivo do MVP

* **Tela do médico** com os botões descritos na proposta (Iniciar/Parar Gravação, Gerar Prontuário, Salvar Rascunho, Homologar).
* **Fluxo completo**: grava áudio → transcrição automática → geração do rASCUNHO SOAP pelo assistente de IA → edição e homologação.
* **Tecnologias**: React + Vite (frontend) + Node + Express (backend leve).
* **Persistência**: arquivos JSON por consulta (nenhum DB).

## 👥 Time (3 pessoas)

|Pessoa|Função principal|Ferramentas focais|
|-|-|-|
|Dev 1|Front‑end (UI \& integração)|React, Vite, Axios, CSS/Styled‑Components|
|Dev 2|Back‑end (API \& IA)|Node, Express, Multer, Axios (LLM), `fs` JSON|
|Dev 3|Integração \& DevOps (CI, QA, Demo)|npm scripts, Git, Docker (opcional), Cypress (test rápido)|

## ⏰ Cronograma 15h (dividido em blocos)

|Horário (aprox.)|Atividade|Responsável|
|-|-|-|
|**0 – 1h**|**Setup inicial** – criar repositório, scaffold Vite e Express, definir estrutura de pastas.|Todos (co‑criação)|
|**1 – 3h**|Front‑end: layout base (Header, Toolbar), integração gravação áudio (Web Audio API).|Dev 1|
|**1 – 3h**|Back‑end: rota `/api/transcribe` (receber Blob, stub STT que devolve texto estático).|Dev 2|
|**3 – 5h**|Front‑end: componente `TranscriptionView` + chamada ao backend, exibir transcrição em tempo real.|Dev 1|
|**3 – 5h**|Back‑end: rota `/api/generate` (stub IA – retorna JSON SOAP fixo).|Dev 2|
|**5 – 7h**|Front‑end: `DraftView` (campos SOAP editáveis) + botão **Gerar Prontuário** que consome `/api/generate`.|Dev 1|
|**5 – 7h**|Back‑end: camada de **persistência JSON** (`storage.js`) – salvar consulta completa e rascunho.|Dev 2|
|**7 – 9h**|Integração: conectar front‑end com backend completo, testes manuais de fluxo (áudio → rascunho).|Dev 3 (com apoio de Dev 1/2)|
|**9 – 10h**|Design polish – aplicar tema escuro, glassmorphism, micro‑animações, tipografia Inter.|Dev 1|
|**10 – 11h**|Implementar **endpoint `/api/approve`** que marca status `Homologado` e persiste no JSON.|Dev 2|
|**11 – 12h**|Testes rápidos (Cypress ou Playwright) para os principais caminhos + correção de bugs.|Dev 3|
|**12 – 13h**|Documentação rápida: README com instruções de start (`npm run dev`), descrição das rotas e screenshots.|Dev 3|
|**13 – 14h**|Preparação da **demo** – gravar tela, preparar fala explicando fluxo, validar no navegador.|Todos|
|**14 – 15h**|Buffer final: polimento UI, tratamento de erros, revisão de código e commit final.|Todos|

## 📂 Estrutura de Diretórios (já criada – veja `development\_proposal.md`)

```
ProntuAI/
├─ frontend/        # React + Vite
│   ├─ src/
│   │   ├─ components/
│   │   │   ├─ Header.jsx
│   │   │   ├─ Toolbar.jsx
│   │   │   ├─ AudioRecorder.jsx
│   │   │   ├─ TranscriptionView.jsx
│   │   │   └─ DraftView.jsx
│   │   ├─ hooks/
│   │   ├─ services/api.js
│   │   └─ App.jsx
│   └─ index.html
├─ backend/          # Node + Express
│   ├─ src/
│   │   ├─ routes/transcribe.js
│   │   ├─ routes/generate.js
│   │   ├─ routes/approve.js
│   │   ├─ services/aiAssistant.js   # stub/real LLM
│   │   └─ services/storage.js       # JSON file I/O
│   └─ package.json
├─ data/consultas/   # arquivos .json por consulta
└─ README.md
```

## 🔧 Comandos iniciais (para rodar tudo rapidamente)

```bash
# Frontend – Vite
cd frontend
npm create vite@latest . -- --template react   # aceita defaults
npm install
npm install axios styled-components        # ou css‑modules se preferir
npm run dev   # http://localhost:5173

# Backend – Express
cd ../backend
npm init -y
npm install express multer axios dotenv
# criar arquivos server.js, routes/... conforme proposta
npm run dev   # configure com nodemon ou node src/server.js
```

> \*\*Dica:\*\* Use `concurrently` no root `package.json` para subir front e back com um único `npm run dev`.

## ✅ Critérios de Aceitação para a Demo

1. Médico pode **iniciar** e **parar** gravação; ao parar, a transcrição aparece na tela.
2. Ao clicar **Gerar Prontuário**, o backend devolve um **rASCUNHO SOAP** exibido em campos editáveis.
3. Médico pode **editar** e **salvar** o rascunho (JSON atualizado em `data/consultas/`).
4. Botão **Homologar** marca o prontuário como final e impede novas edições.
5. UI tem visual premium (tema escuro, glassmorphism, animações leves).

## ⚠️ Riscos \& Mitigações (tempo limitado)

|Risco|Impacto|Mitigação|
|-|-|-|
|STT real demora / API fora|Bloqueio fluxo|Usar stub (texto fixo) inicialmente; substituir depois se houver tempo.|
|IA lenta ou indisponível|Falha geração|Stub IA que retorna JSON de exemplo; trocar por chamada real somente se sobra tempo.|
|Integração front‑back incompleta|Demo quebrada|Priorizar endpoints críticos (`/transcribe`, `/generate`, `/approve`).|
|Falta de design polish|Aparência amadora|Aplicar estilos globais rapidamente (dark theme, fontes Inter) – já incluído nos blocos de design.|

\---

### 🎉 Boa sorte no hackathon!

Seguindo esse plano de 15 h, a equipe consegue entregar um MVP funcional, visualmente agradável e pronto para demonstração. Qual bloco vocês querem iniciar primeiro?