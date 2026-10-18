Proposta do projeto 

## Identificação

- Nome provisório: ProntuAI

- Integrantes: Silvia Maria Albuquerque Monteiro; Sarah Letícia Domingues dos Santos; Daniel Moraes Delgado

- Público usuário: Médicos e Pacientes

- Problema concreto: Durante as consultas, o médico precisa dividir a atenção entre ouvir o paciente e digitar no prontuário eletrônico. Isso consome até metade do tempo de atendimento, prejudica o contato visual, gera registros incompletos ou com linguagem informal, e obriga o médico a traduzir mentalmente expressões populares (ex.: "queimação no peito da rosca", "comida voltando") para terminologia médica formal (epigastralgia, pirose, regurgitação), além de buscar manualmente códigos CID-10.

- Processo atual: O médico ouve o paciente, faz anotações rápidas em papel ou digita diretamente no sistema enquanto a consulta acontece, traduz mentalmente a fala coloquial para termos semiológicos, realiza o exame físico ditando achados para si mesmo, busca códigos CID-10 em tabelas e redige o prontuário completo ao final — frequentemente de memória, com risco de omissões e inconsistências.

- Resultado esperado: Uma tela onde o médico grava o áudio da consulta, obtém a transcrição automática do diálogo e, com um clique, gera um prontuário estruturado no padrão SOAP (Subjetivo, Objetivo, Avaliação e Plano) por meio de uma assistente de IA. A IA filtra amenidades, converte linguagem popular para terminologia médica, sugere códigos CID-10 e respeita a regra de fidelidade (nunca inventa dados não mencionados). O médico revisa, edita se necessário e homologa o registro final.


## Processo principal

Início: O médico abre a tela de atendimento do ProntuAI, identifica o paciente e inicia a gravação do áudio da consulta.

Decisão: Ao encerrar a gravação, o médico solicita a geração do prontuário. A IA processa a transcrição: descarta trechos irrelevantes (amenidades, comentários sobre clima, futebol etc.), traduz expressões coloquiais para termos médicos formais e estrutura os dados clínicos nas seções SOAP, sugerindo hipóteses diagnósticas com código CID-10.

Mudança de estado: O `Prontuario` passa de `Rascunho` (gerado pela IA) para `EmRevisao` (quando o médico abre a edição) e então para `Homologado` (após aprovação médica). A `Consulta` acompanha: de `EmAndamento` para `AguardandoRevisao` e finalmente `Finalizada`.

Atendimento: O médico visualiza o prontuário SOAP gerado lado a lado com a transcrição original. Pode editar qualquer seção, aceitar ou rejeitar sugestões de CID-10 e complementar a conduta. Campos sem informação na transcrição aparecem como "Não mencionado na transcrição" conforme a regra de fidelidade.

Encerramento: O médico homologa o prontuário revisado. O registro original torna-se imutável para auditoria, é salvo no histórico do paciente.


## Conceitos do domínio

| Conceito | Identidade | Estado relevante | Comportamento próprio |
| :-- | :-- | :-- | :-- |
| `Consulta` | ID único (`consultaId`) | `EmAndamento`, `AguardandoRevisao`, `Finalizada`, `Cancelada` | Iniciar gravação, encerrar gravação, solicitar geração de prontuário, finalizar atendimento. |
| `Transcricao` | ID único (`transcricaoId`) vinculado a uma `Consulta` | `Gravando`, `Processando`, `Concluida`, `Erro` | Capturar áudio, converter fala em texto (STT), identificar locutor (Médico vs. Paciente), segmentar turnos de fala. |
| `Prontuario` | ID único (`prontuarioId`) vinculado a uma `Consulta` | `Rascunho`, `EmRevisao`, `Homologado` | Preencher seções SOAP a partir da transcrição processada pela IA, registrar campos ausentes como "Não mencionado", vincular sugestões de CID-10, consolidar versão final imutável. |
| `SugestaoCID` | ID da sugestão (`sugestaoCidId`) + código CID-10 | `Sugerida`, `Aceita`, `Rejeitada` | Associar código CID-10 à hipótese diagnóstica, registrar evidência textual extraída da transcrição, aceitar ou rejeitar pelo médico. |
| `Paciente` | Identificador (`pacienteId`) | `Ativo`, `Inativo` | Manter dados de identificação (nome, idade) e histórico de consultas. |
| `Medico` | CRM + UF (`medicoId`) | `Disponivel`, `EmAtendimento` | Autenticar-se, iniciar/encerrar consulta, revisar e homologar prontuários. |



## Regras e invariantes

| ID      | Regra | Objetos envolvidos | Sucesso | Falha |
| :-- | :-- | :-- | :-- | :-- |
| `REG-01` | O prontuário gerado pela IA só pode ser homologado após revisão explícita do médico (Human-in-the-Loop). | `Prontuario`, `Medico` | Prontuário transita para `Homologado` com identificação do médico revisor. | Bloqueio: tentativa de homologação sem revisão humana. |
| `REG-02` | A IA nunca deve inventar, inferir ou supor dados que não estejam explicitamente na transcrição (Regra de Fidelidade). | `Prontuario`, `Transcricao` | Campos sem informação são preenchidos com "Não mencionado na transcrição". | Prontuário contém dados fabricados/alucinados sem correspondência na fala real. |
| `REG-03` | Trechos de amenidades e conversas não clínicas devem ser filtrados e não aparecer nas seções SOAP. | `Transcricao`, `Prontuario` | Comentários sobre clima, futebol etc. são descartados; SOAP contém apenas dados clínicos. | Poluição do prontuário com informações irrelevantes ao ato médico. |
| `REG-04` | Expressões populares do paciente devem ser traduzidas para terminologia médica formal no prontuário. | `Transcricao`, `Prontuario` | "queimação subindo pela garganta" → "pirose retroesternal"; "comida voltando" → "regurgitação". | Prontuário mantém linguagem coloquial inadequada para registro clínico. |
| `REG-05` | Toda sugestão de CID-10 deve estar fundamentada em evidência clínica presente no Subjetivo ou Objetivo. | `SugestaoCID`, `Prontuario` | Sugestão armazena o trecho da transcrição que a justifica. | CID sugerido sem correlação com os achados clínicos registrados. |
| `REG-06` | Se o paciente relatar alergia a um medicamento e o médico prescrevê-lo, a IA deve gerar um alerta de segurança. | `Prontuario`, `SugestaoCID` | Bloco de alerta exibido no topo do prontuário antes da homologação. | Prescrição conflitante com alergia relatada passa despercebida. |




## Ciclo de vida

- Objeto central: `Prontuario`
- Estados: `Rascunho` (gerado pela IA após processar a transcrição) → `EmRevisao` (médico abriu a tela de edição e está conferindo) → `Homologado` (médico aprovou e assinou o registro, tornando-o imutável) | `Cancelado` (consulta cancelada antes da homologação).
- Transições permitidas: `Rascunho` → `EmRevisao` (médico acessa a conferência); `EmRevisao` → `Homologado` (médico aprova); `Rascunho` ou `EmRevisao` → `Cancelado` (cancelamento da consulta).
- Transições proibidas: `Rascunho` → `Homologado` (proibido pular a revisão médica — REG-01); `Homologado` → qualquer estado (imutabilidade do prontuário assinado); `Cancelado` → qualquer estado.



## Fluxos da versão final
| ID | Ação do usuário | Regra principal | Alteração persistida | Resultado |
| :-- | :-- | :-- | :-- | :-- |
| `FL-01` | Médico abre a tela, identifica o paciente e clica em "Iniciar Gravação" | — | `Consulta` criada em `EmAndamento`; `Transcricao` em `Gravando` | Áudio da consulta está sendo capturado em tempo real. |
| `FL-02` | Médico clica em "Parar Gravação" e depois em "Gerar Prontuário" | `REG-02`, `REG-03`, `REG-04` | `Transcricao` passa para `Concluida`; `Prontuario` criado em `Rascunho` com SOAP preenchido e CIDs sugeridos; `Consulta` passa para `AguardandoRevisao` | Tela exibe o prontuário SOAP gerado com amenidades filtradas, termos traduzidos e CIDs sugeridos. |
| `FL-03` | Médico edita seções SOAP e aceita/rejeita CIDs sugeridos | `REG-01`, `REG-05` | `Prontuario` transita para `EmRevisao`; campos editados e status das `SugestaoCID` atualizados | Prontuário reflete as correções do profissional. |
| `FL-04` | Médico clica em "Homologar Prontuário" | `REG-01`, `REG-02` | `Prontuario` passa para `Homologado` (imutável); `Consulta` passa para `Finalizada`; áudio bruto descartado | Prontuário salvo no histórico do paciente, disponível para visualização e exportação. |



## Variação polimórfica
- O que varia: A estratégia de processamento clínico que transforma a transcrição bruta em prontuário SOAP estruturado.
- Contrato possível: Interface `IProcessadorClinico` com o método `gerarProntuario(transcricao: Transcricao): ProntuarioDTO`.
- Implementação 1: `ProcessadorLLM` — Consome modelo de linguagem (ex.: Gemini/GPT) via API com prompt clínico estruturado baseado no prontuariomodelo.md, realizando filtragem de amenidades, tradução semiológica, estruturação SOAP e sugestão de CID-10 em uma única chamada.
- Implementação 2: `ProcessadorRegrasLocais` — Implementação offline baseada em dicionário semiológico em memória e regras determinísticas de mapeamento termo-a-termo, sem dependência de API externa.
- Por que a variação é legítima: Permite que o sistema funcione em modo offline/contingência (sem internet) usando regras locais, ou utilize IA avançada em nuvem quando disponível. Também viabiliza testes unitários rápidos e determinísticos sem custo de API.


## Escopo da AV1
- Fatia vertical escolhida: Uma tela onde o médico grava o áudio da consulta, obtém a transcrição automática e gera o prontuário estruturado SOAP com assistência de IA — incluindo filtragem de amenidades, tradução de termos populares para linguagem médica e sugestão de CID-10. O médico revisa, edita e homologa o prontuário.
- Três regras essenciais: (1) `REG-01` — Prontuário só é homologado após revisão explícita do médico (Human-in-the-Loop); (2) `REG-02` — A IA nunca inventa dados ausentes na transcrição (Regra de Fidelidade); (3) `REG-03` — Amenidades e conversas não clínicas são filtradas das seções SOAP.
- Mudança de estado: `Prontuario` transitando por `Rascunho` → `EmRevisao` → `Homologado`.
- Dados persistidos: Dados da `Consulta`, texto da `Transcricao` (segmentos com identificação de locutor), campos do `Prontuario` (seções SOAP completas) e lista de `SugestaoCID` com seus status (`Aceita`/`Rejeitada`).


## Escopo da AV2
- Evoluções previstas: 
- Três fluxos completos: 
- Falhas tratadas: 
- Testes esperados: 


## Fora do escopo


## Riscos e mitigação
| Risco | Impacto | Mitigação |
| :-- | :-- | :-- |


## Participação

- **Rodízio**: 
- **Revisões cruzadas**: 
- **Conhecimento compartilhado**: