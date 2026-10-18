import React, { useEffect, useState } from 'react';
import { IconCheck } from './Icons.jsx';
import { AssessmentBody, ObjectiveBody, PlanBody, SubjectiveBody, SafetyAlert } from './DraftView.jsx';

const FLASH_PREFIX = { s: 's.', o: 'o.', a: 'a.', p: 'p.' };

const chevron = (dir) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
  </svg>
);

function CheckItem({ ok, label }) {
  return (
    <li className={ok ? 'ok' : ''}>
      <span className="ci-mark">{ok && <IconCheck width={13} height={13} strokeWidth={3} />}</span>
      {label}
    </li>
  );
}

// Revisão em subetapas recolhíveis: cada etapa pode ser aberta e lida com calma.
export default function ReviewFlow({
  draft,
  evidence,
  locked,
  flash,
  conflicts,
  alertAcked,
  onAck,
  onFixAlert,
  onChange,
  onCid,
  onAcceptAll,
  onEvidence,
  reviewed,
  setReviewed,
  pend,
}) {
  const [open, setOpen] = useState(() => new Set());
  const [seen, setSeen] = useState(() => new Set());
  const pendingCids = draft.a.cids.filter((c) => c.status === 'Sugerida').length;
  const alertOk = conflicts.length === 0 || alertAcked;
  const common = { draft, evidence, locked, flash, onChange, onEvidence };

  // Abre a etapa que a assistente acabou de alterar.
  useEffect(() => {
    const hits = Object.keys(FLASH_PREFIX).filter((id) => flash.some((f) => f.startsWith(FLASH_PREFIX[id])));
    if (hits.length) setOpen((prev) => new Set([...prev, ...hits]));
  }, [flash]);

  // Minimizar uma seção marca como revisada (destaque leve no cabeçalho).
  const collapse = (id) => {
    setOpen((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setSeen((prev) => new Set([...prev, id]));
  };
  const expand = (id) => setOpen((prev) => new Set([...prev, id]));
  const toggle = (id) => (open.has(id) ? collapse(id) : expand(id));
  const goTo = (fromId, toId) => {
    collapse(fromId);
    expand(toId);
    setTimeout(() => document.getElementById(`acc-${toId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const steps = [
    {
      id: 's',
      title: 'Subjetivo',
      hint: 'Queixa, HDA, antecedentes e hábitos',
      body: <SubjectiveBody {...common} />,
    },
    {
      id: 'o',
      title: 'Objetivo',
      hint: 'Sinais vitais e exame físico',
      body: <ObjectiveBody {...common} />,
    },
    {
      id: 'a',
      title: 'Avaliação e CID-10',
      hint: 'Hipótese diagnóstica e sugestões de CID',
      badge: !locked && pendingCids > 0 ? { cls: 'badge-attention', text: `${pendingCids} CID pendente${pendingCids > 1 ? 's' : ''}` } : null,
      body: <AssessmentBody {...common} onCid={onCid} onAcceptAll={onAcceptAll} />,
    },
    {
      id: 'p',
      title: 'Plano terapêutico',
      hint: 'Prescrição, exames e orientações',
      badge: !alertOk ? { cls: 'badge-critical', text: 'Alerta de alergia' } : null,
      body: <PlanBody {...common} conflicts={conflicts} alertAcked={alertAcked} onAck={onAck} onFix={onFixAlert} />,
    },
    {
      id: 'c',
      title: 'Conclusão',
      hint: 'Confirmação final e homologação',
      badge: locked
        ? { cls: 'badge-success', text: 'Homologado' }
        : pend.length
          ? { cls: 'badge-attention', text: `${pend.length} pendência${pend.length > 1 ? 's' : ''}` }
          : { cls: 'badge-success', text: 'Pronto' },
      body: (
        <div className="acc-fields">
          {conflicts.length > 0 && (
            <SafetyAlert conflicts={conflicts} acked={alertAcked} onAck={onAck} onFix={onFixAlert} locked={locked} />
          )}
          <ul className="checklist">
            <CheckItem ok={pendingCids === 0} label="Sugestões de CID-10 decididas" />
            <CheckItem ok={alertOk} label="Alerta de segurança tratado" />
            <CheckItem ok={reviewed} label="Revisão do conteúdo confirmada" />
          </ul>
          {!locked && (
            <label className="check">
              <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
              <span>Revisei o conteúdo gerado pela IA e assumo a responsabilidade clínica.</span>
            </label>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="review-wrap">
      <ol className="acc">
        {steps.map((st, i) => {
          const isOpen = open.has(st.id);
          const prev = steps[i - 1];
          const next = steps[i + 1];
          return (
            <li key={st.id} id={`acc-${st.id}`} className={`acc-item ${isOpen ? 'open' : ''} ${seen.has(st.id) && !isOpen ? 'seen' : ''}`}>
              <button type="button" className="acc-head" aria-expanded={isOpen} onClick={() => toggle(st.id)}>
                <span className="acc-num">{i + 1}</span>
                <div className="acc-title">
                  <strong>{st.title}</strong>
                  <span className="muted small">{st.hint}</span>
                </div>
                {st.badge && <span className={`badge ${st.badge.cls}`}>{st.badge.text}</span>}
                {seen.has(st.id) && !isOpen && <span className="seen-tag"><IconCheck width={12} height={12} strokeWidth={3} /> Revisado</span>}
                <span className="expand">
                  {isOpen ? 'Recolher' : 'Expandir'}
                  <i className="chev" />
                </span>
              </button>
              {isOpen && (
                <div className="acc-body">
                  {st.body}
                  <div className="acc-foot">
                    {prev ? (
                      <button type="button" className="arrow-btn" aria-label={`Etapa anterior: ${prev.title}`} title={prev.title} onClick={() => goTo(st.id, prev.id)}>
                        {chevron('left')}
                      </button>
                    ) : (
                      <span />
                    )}
                    {next && (
                      <button type="button" className="arrow-btn" aria-label={`Próxima etapa: ${next.title}`} title={next.title} onClick={() => goTo(st.id, next.id)}>
                        {chevron('right')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
