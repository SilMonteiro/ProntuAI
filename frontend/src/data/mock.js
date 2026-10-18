// Dados mockados da consulta de demonstração.

export const MEDICO = {
  nome: 'Dra. Helena Prado',
  crm: 'CRM 123456/SP',
  especialidade: 'Clínica Médica',
  iniciais: 'HP',
};

export const PACIENTE = {
  id: '00482',
  nome: 'Maria Aparecida Souza',
  iniciais: 'MS',
  idade: 47,
  sexo: 'Feminino',
  convenio: 'Particular',
  ultimaConsulta: '12/03/2026',
};

// Paciente demo (consulta simulada) e paciente para teste com áudio real + IA.
export const PACIENTES = [
  { ...PACIENTE, demo: true, rotulo: 'Consulta simulada (demonstração)' },
  {
    id: '00517',
    nome: 'João Pedro Almeida',
    iniciais: 'JA',
    idade: 52,
    sexo: 'Masculino',
    convenio: 'Particular',
    ultimaConsulta: 'Primeira consulta',
    demo: false,
    rotulo: 'Áudio real · transcrição e prontuário por IA',
  },
];

// speaker: 'M' médico | 'P' paciente.  clinical:false → amenidade (filtrada pela IA, REG-03)
// terms: expressões populares → termo médico (REG-04)
const RAW = [
  { speaker: 'M', clinical: false, text: 'Bom dia, dona Maria! Tudo bem? Pode se sentar.' },
  { speaker: 'P', clinical: false, text: 'Bom dia, doutora. Tudo bem sim, só esse calor que tá de matar, né?' },
  { speaker: 'M', clinical: false, text: 'Pois é, o tempo tá abafado demais. A senhora viu o jogo ontem?' },
  { speaker: 'P', clinical: false, text: 'Vi sim, o Corinthians perdeu de novo, uma tristeza.' },
  { speaker: 'M', clinical: true, text: 'Então, me conta, o que traz a senhora aqui hoje?' },
  {
    speaker: 'P',
    clinical: true,
    text: 'Doutora, faz uns dois meses que eu sinto uma queimação no peito da rosca, que sobe pela garganta, principalmente depois que eu janto.',
    terms: [{ raw: 'queimação no peito da rosca', med: 'pirose retroesternal' }],
  },
  { speaker: 'M', clinical: true, text: 'Essa queimação piora quando a senhora deita?' },
  {
    speaker: 'P',
    clinical: true,
    text: 'Piora demais. De noite eu acordo com a comida voltando na boca e fico com um gosto amargo.',
    terms: [{ raw: 'comida voltando na boca', med: 'regurgitação' }],
  },
  { speaker: 'M', clinical: true, text: 'E a senhora toma alguma coisa pra melhorar?' },
  {
    speaker: 'P',
    clinical: true,
    text: 'Tomo bicarbonato quando aperta, alivia um pouquinho. E tomo losartana de manhã pra pressão, cinquenta miligramas.',
  },
  { speaker: 'M', clinical: true, text: 'A senhora tem alergia a algum remédio?' },
  {
    speaker: 'P',
    clinical: true,
    text: 'Tenho sim, dipirona. Dá uma coceira e o corpo fica todo vermelho.',
    terms: [{ raw: 'coceira e o corpo fica todo vermelho', med: 'prurido e eritema generalizado' }],
  },
  { speaker: 'M', clinical: true, text: 'Anotado. Fuma ou bebe? Tem algum caso de doença aqui na família?' },
  {
    speaker: 'P',
    clinical: true,
    text: 'Fumar eu não fumo, mas tomo uma tacinha de vinho no fim de semana. Meu pai teve gastrite brava e minha mãe é hipertensa.',
    terms: [{ raw: 'tacinha de vinho no fim de semana', med: 'etilismo social' }],
  },
  { speaker: 'P', clinical: true, text: 'E como muita besteira também, a gente adora uma feijoada, né?' },
  {
    speaker: 'M',
    clinical: true,
    text: 'Vamos examinar. Pressão cento e trinta por oitenta e cinco, frequência setenta e oito, peso oitenta e dois quilos, altura um metro e sessenta e dois.',
  },
  {
    speaker: 'M',
    clinical: true,
    text: 'Abdome flácido, doloroso à palpação superficial do epigástrio, sem massas, sem sinais de irritação peritoneal. Ausculta cardíaca normocárdica, bulhas normofonéticas em dois tempos, sem sopros.',
  },
  {
    speaker: 'M',
    clinical: true,
    text: 'Pelo quadro, a hipótese é doença do refluxo gastroesofágico. Vou pedir uma endoscopia digestiva alta pra avaliar.',
  },
  {
    speaker: 'M',
    clinical: true,
    text: 'Vou receitar omeprazol quarenta miligramas, um comprimido em jejum, por oito semanas. E se tiver dor, pode tomar dipirona de seis em seis horas.',
  },
  {
    speaker: 'M',
    clinical: true,
    text: 'Evite deitar logo depois do jantar, eleve a cabeceira da cama e reduza gordura e vinho. Retorno em trinta dias com o resultado da endoscopia.',
  },
  { speaker: 'P', clinical: false, text: 'Tá bom, doutora, muito obrigada! Manda um abraço pro seu marido.' },
];

let t = 0;
export const SEGMENTS = RAW.map((s, i) => {
  const dur = Math.max(2.4, s.text.length / 18);
  const seg = { id: i + 1, terms: [], ...s, start: t, dur };
  t += dur + 0.6;
  return seg;
});
export const DURATION = t;

// Trechos da transcrição que fundamentam cada campo do prontuário.
export const EVIDENCE = {
  's.qp': [6],
  's.hma': [6, 7, 8, 10],
  's.hist': [10],
  's.alergias': [12],
  's.meds': [10],
  's.habitos': [14, 15],
  'o.sinais': [16],
  'o.exame': [17],
  'o.comp': [],
  'a.hip': [18],
  'p.rx': [19],
  'p.exames': [18],
  'p.orient': [20],
};

export const PROCESSING_STATS = {
  filtrados: SEGMENTS.filter((s) => !s.clinical).length,
  termos: SEGMENTS.reduce((n, s) => n + s.terms.length, 0),
};

export function buildInitialDraft(dataHora) {
  return {
    status: 'Rascunho',
    ident: {
      nome: PACIENTE.nome,
      idade: `${PACIENTE.idade} anos`,
      dataHora,
    },
    s: {
      qp: 'Pirose retroesternal há cerca de 2 meses.',
      hma: 'Paciente refere há aproximadamente 2 meses pirose retroesternal ascendente, de predomínio pós-prandial (após o jantar). Piora em decúbito, com despertar noturno associado a regurgitação e sabor amargo na boca. Alívio parcial com bicarbonato de sódio.',
      hist: 'Uso de losartana para controle da pressão arterial. Demais comorbidades e cirurgias prévias: Não mencionado.',
      alergias: 'Dipirona — prurido e eritema generalizado.',
      meds: 'Losartana 50 mg, pela manhã. Bicarbonato de sódio, uso eventual para alívio sintomático.',
      habitos:
        'Nega tabagismo. Etilismo social (uma taça de vinho nos fins de semana). Refere alimentação rica em gordura (feijoada). Antecedentes familiares: pai com gastrite; mãe hipertensa.',
    },
    o: {
      sinais:
        'PA 130 x 85 mmHg; FC 78 bpm; Peso 82 kg; Altura 1,62 m. Temperatura, FR e SpO2: Não aferidos/registrados na transcrição.',
      exame:
        'Abdome flácido, doloroso à palpação superficial do epigástrio, sem massas, sem sinais de irritação peritoneal. Ausculta cardíaca normocárdica, bulhas normofonéticas em dois tempos, sem sopros.',
      comp: 'Nenhum exame apresentado',
    },
    a: {
      hip: 'Doença do refluxo gastroesofágico (DRGE).',
      cids: [
        {
          id: 'cid1',
          code: 'K21.9',
          desc: 'Doença do refluxo gastroesofágico sem esofagite',
          quote: '“…queimação no peito da rosca, que sobe pela garganta…” · “…a hipótese é doença do refluxo gastroesofágico.”',
          segs: [6, 8, 18],
          status: 'Sugerida',
        },
        {
          id: 'cid2',
          code: 'R10.1',
          desc: 'Dor localizada no abdome superior (epigastralgia)',
          quote: '“…doloroso à palpação superficial do epigástrio…”',
          segs: [17],
          status: 'Sugerida',
        },
        {
          id: 'cid3',
          code: 'I10',
          desc: 'Hipertensão essencial (comorbidade referida)',
          quote: '“…tomo losartana de manhã pra pressão…” · “…minha mãe é hipertensa.”',
          segs: [10, 14],
          status: 'Sugerida',
        },
      ],
    },
    p: {
      rx: [
        { id: 'rx1', med: 'Omeprazol 40 mg', pos: '1 comprimido, via oral, em jejum, por 8 semanas.' },
        { id: 'rx2', med: 'Dipirona', pos: 'A cada 6 horas, se dor. (Dose não mencionada na transcrição.)' },
      ],
      exames: [{ id: 'ex1', text: 'Endoscopia digestiva alta' }],
      orient:
        'Evitar decúbito logo após o jantar; elevar a cabeceira da cama; reduzir ingestão de gordura e de vinho. Retorno em 30 dias com resultado da endoscopia digestiva alta.',
    },
  };
}
