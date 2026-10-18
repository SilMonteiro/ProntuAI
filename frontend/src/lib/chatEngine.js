// Assistente de IA mockado: interpreta pedidos do médico por regras simples
// e devolve um novo rascunho + resposta. Substituível por chamada real a um LLM.
import { findAllergyConflicts } from './draft.js';

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const EXAMS = [
  [/hemograma/, 'Hemograma completo'],
  [/pylori|h\.? ?p/, 'Pesquisa de H. pylori'],
  [/ultrassom|ultrassonografia|usg/, 'Ultrassonografia de abdome total'],
  [/glicemia/, 'Glicemia de jejum'],
  [/ecg|eletrocardiograma/, 'Eletrocardiograma'],
  [/lipid|colesterol/, 'Perfil lipídico'],
  [/tsh/, 'TSH'],
  [/creatinina|funcao renal/, 'Creatinina sérica'],
];

let uid = 100;
const nextId = (p) => `${p}${uid++}`;

export const SUGGESTIONS = [
  'Substitua a dipirona por paracetamol 750 mg',
  'Altere o retorno para 15 dias',
  'Adicione hemograma aos exames solicitados',
  'Resuma a história da moléstia atual',
  'Por que você sugeriu o CID K21.9?',
  'Registre temperatura de 36,5 °C',
];

export function respond(text, draft) {
  const t = norm(text);
  const nothing = { draft, changed: [], log: null };

  // 1) substituir medicamento
  let m = t.match(/(troc|substitu|mud)\w*\s+(?:a |o )?(\w+)\s+(?:por|para|pelo|pela)\s+(?:o |a )?(\w+)/);
  if (m) {
    const [, , from, to] = m;
    const idx = draft.p.rx.findIndex((r) => norm(r.med).includes(from));
    if (idx >= 0) {
      const dose = text.match(/(\d+[.,]?\d*)\s*mg/i);
      const old = draft.p.rx[idx];
      const novo = {
        ...old,
        med: `${cap(to)}${dose ? ` ${dose[1]} mg` : ''}`,
        pos: dose ? old.pos.replace(/\(.*\)/, '').trim() : old.pos,
      };
      const rx = draft.p.rx.map((r, i) => (i === idx ? novo : r));
      const nd = { ...draft, p: { ...draft.p, rx } };
      const still = findAllergyConflicts(nd).length;
      return {
        draft: nd,
        changed: ['p.rx'],
        log: `Plano › Prescrição: ${old.med} → ${novo.med}`,
        reply: `Feito: substituí **${old.med}** por **${novo.med}** na prescrição (${novo.pos}).${
          still ? '' : ' O alerta de segurança por alergia foi resolvido.'
        } Lembrando que a escolha do fármaco foi sua instrução — não constava na fala da consulta.`,
      };
    }
  }

  // 2) remover medicamento
  m = t.match(/(remov|retir|exclu|apag)\w*\s+(?:a |o )?(?:prescricao (?:de |da |do )?)?(\w+)/);
  if (m && draft.p.rx.some((r) => norm(r.med).includes(m[2]))) {
    const target = draft.p.rx.find((r) => norm(r.med).includes(m[2]));
    const nd = { ...draft, p: { ...draft.p, rx: draft.p.rx.filter((r) => r.id !== target.id) } };
    return {
      draft: nd,
      changed: ['p.rx'],
      log: `Plano › Prescrição: removido ${target.med}`,
      reply: `Removi **${target.med}** da prescrição.${
        findAllergyConflicts(nd).length ? '' : ' Não há mais conflito com as alergias relatadas.'
      }`,
    };
  }

  // 3) retorno
  m = t.match(/retorno.*?(\d+)\s*(dias?|semanas?|mes(?:es)?)/) || t.match(/(\d+)\s*(dias?|semanas?|mes(?:es)?).*retorno/);
  if (m) {
    const n = m[1];
    const un = m[2].startsWith('mes') ? (n === '1' ? 'mês' : 'meses') : m[2].startsWith('sem') ? (n === '1' ? 'semana' : 'semanas') : n === '1' ? 'dia' : 'dias';
    const suffix = /com resultado[^.]*/.exec(draft.p.orient)?.[0];
    const frase = `Retorno em ${n} ${un}${suffix ? ` ${suffix}` : ''}.`;
    const base = /Retorno em [^.]*\./.test(draft.p.orient)
      ? draft.p.orient.replace(/Retorno em [^.]*\./, frase)
      : `${draft.p.orient} ${frase}`;
    return {
      draft: { ...draft, p: { ...draft.p, orient: base } },
      changed: ['p.orient'],
      log: `Plano › Orientações: retorno em ${n} ${un}`,
      reply: `Ajustei o retorno para **${n} ${un}** em Orientações e Encaminhamentos.`,
    };
  }

  // 4) temperatura informada pelo médico
  m = t.match(/temperatura\s*(?:de|:)?\s*(\d{2}(?:[.,]\d)?)/);
  if (m) {
    const v = m[1].replace('.', ',');
    const sinais = draft.o.sinais.replace(/Temperatura, FR e SpO2:[^.]*\.?/i, '').trim();
    const novo = `${sinais.replace(/\.$/, '')}; Temperatura ${v} °C (informada pelo médico). FR e SpO2: Não aferidos/registrados na transcrição.`;
    return {
      draft: { ...draft, o: { ...draft.o, sinais: novo } },
      changed: ['o.sinais'],
      log: `Objetivo › Sinais vitais: temperatura ${v} °C`,
      reply: `Registrei **temperatura ${v} °C** nos sinais vitais, marcada como *informada pelo médico* — esse dado não estava na gravação (Regra de Fidelidade).`,
    };
  }

  // 5) orientações
  m = text.match(/(?:adicion|inclu|acrescent)\w*\s+(?:nas?\s+)?orienta[çc][õo]es?\s*(?:de|que|:)?\s*(.+)/i);
  if (m) {
    const frase = cap(m[1].trim().replace(/\.$/, ''));
    return {
      draft: { ...draft, p: { ...draft.p, orient: `${draft.p.orient} ${frase}.` } },
      changed: ['p.orient'],
      log: 'Plano › Orientações: nova orientação adicionada',
      reply: `Adicionei a orientação: “${frase}.”`,
    };
  }

  // 6) exames
  if (/(adicion|inclu|solicit|pe[cç]a|pedir|acrescent)/.test(t)) {
    const hit = EXAMS.find(([re]) => re.test(t));
    if (hit) {
      const name = hit[1];
      if (draft.p.exames.some((e) => e.text === name)) {
        return { ...nothing, reply: `**${name}** já consta nos exames solicitados.` };
      }
      return {
        draft: { ...draft, p: { ...draft.p, exames: [...draft.p.exames, { id: nextId('ex'), text: name }] } },
        changed: ['p.exames'],
        log: `Plano › Exames solicitados: + ${name}`,
        reply: `Incluí **${name}** em Exames Solicitados.`,
      };
    }
    return { ...nothing, reply: 'Qual exame devo incluir? Ex.: hemograma, pesquisa de H. pylori, ultrassom de abdome, glicemia, ECG.' };
  }

  // 7) CIDs
  if (/(aceit|aprov).*cid/.test(t)) {
    const cids = draft.a.cids.map((c) => (c.status === 'Sugerida' ? { ...c, status: 'Aceita' } : c));
    return {
      draft: { ...draft, a: { ...draft.a, cids } },
      changed: ['a.cids'],
      log: 'Avaliação › CID-10: sugestões pendentes aceitas',
      reply: 'Marquei como **aceitas** todas as sugestões de CID-10 que estavam pendentes.',
    };
  }
  m = t.match(/(rejeit|descart|recus)\w*.*?([a-z]\d{2}(?:\.\d)?|hipertens\w*)/);
  if (m) {
    const key = m[2];
    const c = draft.a.cids.find((x) => norm(x.code) === key || norm(x.desc).includes(key));
    if (c) {
      const cids = draft.a.cids.map((x) => (x.id === c.id ? { ...x, status: 'Rejeitada' } : x));
      return {
        draft: { ...draft, a: { ...draft.a, cids } },
        changed: ['a.cids'],
        log: `Avaliação › CID-10: ${c.code} rejeitado`,
        reply: `Rejeitei o CID **${c.code}** (${c.desc}).`,
      };
    }
  }

  // 8) resumo da HMA
  if (/(resum|encurt|conciso|mais curt)/.test(t)) {
    const hma =
      'Pirose retroesternal ascendente há ~2 meses, pós-prandial, com piora em decúbito, regurgitação e sabor amargo noturnos. Alívio parcial com bicarbonato.';
    return {
      draft: { ...draft, s: { ...draft.s, hma } },
      changed: ['s.hma'],
      log: 'Subjetivo › HMA: texto resumido',
      reply: 'Resumi a História da Moléstia Atual mantendo apenas os fatos mencionados na consulta.',
    };
  }

  // 9) justificativas
  if (/(por ?que|porque|justific|evidencia|fundament)/.test(t)) {
    return {
      ...nothing,
      reply:
        'O **K21.9** foi sugerido por três evidências: (1) a queixa de “queimação no peito da rosca que sobe pela garganta” (pirose retroesternal), (2) piora ao deitar com regurgitação noturna e (3) a sua hipótese verbalizada de “doença do refluxo gastroesofágico”. Clique em *ver na transcrição* em qualquer campo para conferir os trechos.',
    };
  }

  // 10) ajuda
  if (/^(oi|ola|bom dia|ajuda|help)|o que (voce|vc) (faz|pode)/.test(t)) {
    return {
      ...nothing,
      reply:
        'Posso ajustar o rascunho a seu pedido: trocar ou remover medicamentos, incluir exames, mudar o prazo de retorno, resumir a HMA, aceitar/rejeitar CIDs e explicar as evidências. Tudo continua pendente da sua homologação.',
    };
  }

  return {
    ...nothing,
    reply:
      'Não consegui interpretar esse ajuste. Tente algo como “substitua a dipirona por paracetamol 750 mg”, “altere o retorno para 15 dias” ou “adicione hemograma aos exames”.',
  };
}
