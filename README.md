# ProntuAI

MVP de hackathon: o médico grava a consulta, recebe a transcrição, a IA gera o rascunho SOAP e o médico revisa (com chat) e homologa.

## Frontend (demo com dados mockados)

```bash
cd frontend
npm install
npm run dev     # http://localhost:5173
```

### Roteiro da demo
1. **Iniciar gravação** — a consulta mockada (Maria Aparecida Souza) "toca" e a transcrição aparece ao vivo. Use 1x/2x/4x, "Avançar para o fim" ou ligue a voz sintética.
2. **Parar gravação** → **Gerar prontuário com IA**.
3. Revise o rascunho SOAP: amenidades filtradas, termos populares traduzidos, CIDs com evidência, campos ausentes como "Não mencionado".
4. **Alerta de segurança**: paciente alérgica a dipirona, e a dipirona foi prescrita. Resolva pelo chat ("Substitua a dipirona por paracetamol 750 mg").
5. Aceite/rejeite os CIDs, marque a revisão e **Homologar** (registro imutável).

Regras da proposta cobertas: REG-01 (human-in-the-loop), REG-02 (fidelidade), REG-03 (amenidades), REG-04 (tradução), REG-05 (CID com evidência), REG-06 (alerta de alergia).
