## 1. Visão Geral
O objetivo deste documento é descrever como deve ser um prontuário médico claro, conciso e padronizado no formato **SOAP** (Subjetivo, Objetivo, Avaliação, Plano).

---

## 2. Regra Fundamental: Tratamento de Informações Ausentes ou Não Informadas

> **REGRA DE FIDELIDADE  **:
> - O agente **NUNCA** deve inventar, inferir ou supor dados de identificação, sintomas, exames ou prescrições que não estejam explicitamente citados na transcrição.
> - Se uma seção ou campo específico não for mencionado durante a consulta (por exemplo: se o médico não realizou ou não ditou o exame físico, ou se o histórico familiar não foi abordado):
>   - **Opção A (Campos fixos/Estruturados):** Preencher expressamente com `Não mencionado na transcrição` ou `Não informado`.
>   - **Opção B (Subseções sem conteúdo):** Omitir a subseção inteira para manter o documento limpo (ex.: se nenhuma alergia foi mencionada, omitir a subseção *Alergias* ou registrar `Nenhuma alergia relatada/mencionada`).

---

## 3. Estrutura Padrão do Prontuário

### 1. Identificação do Paciente
- **Nome do Paciente**: [Nome citado na transcrição | *Não informado*]
- **Idade / Data de Nascimento**: [Idade ou data citada | *Não informada*]
- **Data e Hora da Consulta**: [Data/Hora informada no contexto do sistema]

---

### 2. S — Subjetivo (Relato do Paciente e Anamnese)
*Mencionar apenas o que foi relatado pelo paciente ou perguntado/confirmado pelo médico.*

- **Queixa Principal (QP)**: 
  - *Resumo direto do motivo que levou o paciente à consulta.*
- **História da Moléstia Atual (HMA)**: 
  - *Detalhamento cronológico dos sintomas, início, intensidade, evolução e fatores de melhora/piora citados.*
- **Histórico Médico Pregresso e Comorbidades**: 
  - *Doenças prévias, cirurgias ou condições crônicas citadas. Se não abordado, preencher:* `Não mencionado`.
- **Alergias**: 
  - *Alergias medicamentosas ou alimentares relatadas. Se não abordado, preencher:* `Não informado na transcrição`.
- **Medicamentos em Uso Contínuo**: 
  - *Medicamentos citados pelo paciente. Se nenhum for citado, registrar:* `Nenhum informado`.
- **Histórico Familiar e Hábitos de Vida**: 
  - *Casos de doenças na família, tabagismo, etilismo ou rotina relatados. Se não citado, preencher:* `Não abordado`.

---

### 3. O — Objetivo (Exame Físico e Achados Clínicos)
*Registrar apenas os dados que o médico explicitamente ditar, ler em voz alta ou examinar durante o atendimento.*

- **Sinais Vitais**: 
  - *PA, FC, FR, Temperatura, SpO2, Peso, Altura, IMC (se ditados). Caso contrário, indicar:* `Não aferidos/registrados na transcrição`.
- **Exame Físico Segmentar**: 
  - *Descrição dos achados do exame físico ditaram durante a consulta (ex.: ausculta cardíaca, palpação abdominal, oroscopia). Se não houver exame físico relatado, preencher:* `Exame físico não descrito na transcrição`.
- **Exames Complementares Analisados**: 
  - *Resultados de exames laboratoriais ou de imagem que o médico leu/discutiu na consulta. Se nenhum foi apresentado, registrar:* `Nenhum exame apresentado`.

---

### 4. A — Avaliação (Impressão Diagnóstica)
- **Hipótese Diagnóstica / Diagnóstico Definitivo**: 
  - *Conclusões ou hipóteses discutidas pelo médico.*
- **Mapeamento CID-10 / CID-11**: 
  - *Código e descrição do diagnóstico correspondente, quando puder ser diretamente correlacionado à hipótese médica.*

---

### 5. P — Plano Terapêutico (Conduta)
- **Prescrição de Medicamentos**: 
  - *Lista de medicamentos prescritos com posologia, via de administração, dose e tempo de uso.*
  - *Se nenhuma medicação foi receitada, registrar:* `Sem prescrição medicamentosa nesta consulta`.
- **Exames Solicitados**: 
  - *Exames laboratoriais, de imagem ou complementares solicitados pelo médico durante a consulta. Se nenhum foi pedido, registrar:* `Nenhum exame solicitado`.
- **Orientações e Encaminhamentos**: 
  - *Recomendações dadas ao paciente (dieta, repouso, retornos) e encaminhamentos a outros especialistas.*

---

## 4. Regras de Processamento da Linguagem (LLM)

1. **Tradução para Termos Médicos**:
   - Tratar e converter termos informais ditos pelo paciente para a terminologia técnica médica formal no prontuário (Exemplo: *"dor de cabeça pontuda"* -> *"cefaleia pulsátil"*; *"queimação no estômago"* -> *"epigastralgia/pirose"*).

2. **Detecção e Destaque de Inconsistências / Alertas de Segurança**:
   - Se o paciente relatar alergia a algum medicamento (ex: *dipirona*) e durante a consulta o médico receitar esse mesmo medicamento sem notar, o agente deve gerar um **Bloco de Alerta de Segurança** no topo do prontuário:
     > **ALERTA DE SEGURANÇA**: O paciente relatou alergia a [Medicamento], mas foi identificada a prescrição do mesmo no Plano Terapêutico.