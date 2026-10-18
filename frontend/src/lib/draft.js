export const fmtTime = (s) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

export const fmtDateTime = (d) =>
  d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).replace(',', '');

export function getIn(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}

export function setIn(obj, path, value) {
  const [head, ...rest] = path.split('.');
  if (!rest.length) return { ...obj, [head]: value };
  return { ...obj, [head]: setIn(obj[head], rest.join('.'), value) };
}

// Campos que seguem a Regra de Fidelidade (REG-02) e exibem "não mencionado".
export const isMissing = (v) =>
  typeof v === 'string' && /^(não (mencionado|informado|abordado|aferidos)|nenhum|exame físico não descrito|sem prescrição)/i.test(v.trim());

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

// REG-06: alergia relatada x medicamento prescrito.
const KNOWN_DRUGS = ['dipirona', 'penicilina', 'amoxicilina', 'ibuprofeno', 'diclofenaco', 'aas', 'sulfa', 'cefalexina'];

export function findAllergyConflicts(draft) {
  const allergies = norm(draft.s.alergias);
  const allergens = KNOWN_DRUGS.filter((d) => allergies.includes(d));
  const conflicts = [];
  draft.p.rx.forEach((item) => {
    const hit = allergens.find((a) => norm(item.med).includes(a));
    if (hit) conflicts.push({ rxId: item.id, allergen: hit, med: item.med });
  });
  return conflicts;
}

export function pendencias(draft, { alertOk, reviewed }) {
  const out = [];
  const open = draft.a.cids.filter((c) => c.status === 'Sugerida').length;
  if (open) out.push(`decidir ${open} CID-10 sugerido${open > 1 ? 's' : ''}`);
  if (!alertOk) out.push('tratar o alerta de segurança');
  if (!reviewed) out.push('confirmar a revisão integral');
  return out;
}
