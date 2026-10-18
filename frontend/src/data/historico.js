// Histórico de consultas e prontuários homologados anteriores (dados fictícios).
// Chave: id do paciente em PACIENTES (data/mock.js).

export const HISTORICO = {
  '00482': [
    {
      id: 'h-2026-03',
      data: '12/03/2026',
      hora: '09:30',
      medico: 'Dra. Helena Prado',
      motivo: 'Pirose retroesternal pós-prandial',
      cids: ['K21.9'],
      resumo:
        'Queimação retroesternal há cerca de 2 meses, pós-prandial e com piora em decúbito. Prescrito omeprazol 40 mg por 8 semanas. Retorno em 30 dias com resultado da endoscopia digestiva alta.',
      soap: [
        {
          letra: 'S',
          titulo: 'Subjetivo',
          itens: [
            ['Queixa principal', 'Pirose retroesternal há cerca de 2 meses.'],
            ['Alergias', 'Dipirona — prurido e eritema generalizado.'],
            ['Medicamentos em uso', 'Losartana 50 mg, pela manhã.'],
          ],
        },
        {
          letra: 'O',
          titulo: 'Objetivo',
          itens: [
            ['Sinais vitais', 'PA 130 x 85 mmHg; FC 78 bpm; peso 82 kg.'],
            ['Exame físico', 'Abdome flácido, doloroso à palpação do epigástrio.'],
          ],
        },
        {
          letra: 'A',
          titulo: 'Avaliação',
          itens: [
            ['Hipótese diagnóstica', 'Doença do refluxo gastroesofágico.'],
            ['CID-10', 'K21.9 — Doença do refluxo gastroesofágico sem esofagite.'],
          ],
        },
        {
          letra: 'P',
          titulo: 'Plano',
          itens: [
            ['Prescrição', 'Omeprazol 40 mg — 1 comprimido em jejum, por 8 semanas.'],
            ['Exames', 'Endoscopia digestiva alta.'],
            ['Orientações', 'Evitar deitar logo após o jantar; elevar a cabeceira; reduzir gordura e vinho.'],
          ],
        },
      ],
    },
    {
      id: 'h-2025-11',
      data: '10/11/2025',
      hora: '14:00',
      medico: 'Dra. Helena Prado',
      motivo: 'Acompanhamento de hipertensão arterial',
      cids: ['I10'],
      resumo:
        'PA 132 x 86 mmHg em uso de losartana 50 mg. Medicação mantida e orientação de dieta com redução de sódio. Retorno em 3 meses.',
      soap: [
        {
          letra: 'S',
          titulo: 'Subjetivo',
          itens: [
            ['Queixa principal', 'Acompanhamento de rotina da pressão arterial.'],
            ['Medicamentos em uso', 'Losartana 50 mg, pela manhã.'],
          ],
        },
        {
          letra: 'O',
          titulo: 'Objetivo',
          itens: [['Sinais vitais', 'PA 132 x 86 mmHg; FC 74 bpm.']],
        },
        {
          letra: 'A',
          titulo: 'Avaliação',
          itens: [
            ['Hipótese diagnóstica', 'Hipertensão arterial controlada em tratamento.'],
            ['CID-10', 'I10 — Hipertensão essencial (primária).'],
          ],
        },
        {
          letra: 'P',
          titulo: 'Plano',
          itens: [
            ['Prescrição', 'Losartana 50 mg — 1 comprimido pela manhã, uso contínuo.'],
            ['Orientações', 'Dieta com redução de sódio; atividade física regular. Retorno em 3 meses.'],
          ],
        },
      ],
    },
    {
      id: 'h-2025-06',
      data: '15/06/2025',
      hora: '08:15',
      medico: 'Dra. Helena Prado',
      motivo: 'Check-up anual',
      cids: ['Z00.0'],
      resumo:
        'Paciente sem queixas no momento. Solicitados hemograma, glicemia de jejum e perfil lipídico. Orientada a manter atividade física.',
      soap: [
        {
          letra: 'S',
          titulo: 'Subjetivo',
          itens: [
            ['Queixa principal', 'Consulta de rotina, sem queixas no momento.'],
            ['Hábitos de vida', 'Nega tabagismo. Etilismo social.'],
          ],
        },
        {
          letra: 'O',
          titulo: 'Objetivo',
          itens: [['Exame físico', 'Sem alterações relevantes ao exame clínico.']],
        },
        {
          letra: 'A',
          titulo: 'Avaliação',
          itens: [
            ['Hipótese diagnóstica', 'Avaliação de rotina.'],
            ['CID-10', 'Z00.0 — Exame médico geral.'],
          ],
        },
        {
          letra: 'P',
          titulo: 'Plano',
          itens: [
            ['Exames', 'Hemograma completo; glicemia de jejum; perfil lipídico.'],
            ['Orientações', 'Manter atividade física e alimentação equilibrada.'],
          ],
        },
      ],
    },
  ],
  '00517': [],
};
