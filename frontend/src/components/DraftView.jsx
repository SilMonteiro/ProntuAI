import React, { useLayoutEffect, useRef } from 'react';
import { EVIDENCE } from '../data/mock.js';
import { getIn, isMissing } from '../lib/draft.js';
import { IconAlert, IconCheck, IconLink, IconPlus, IconX } from './Icons.jsx';

function AutoArea({ value, onChange, disabled, className = '' }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      className={className}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}

function Field({ label, path, draft, evidence = EVIDENCE, locked, flash, onChange, onEvidence }) {
  const value = getIn(draft, path);
  const ev = evidence[path] || [];
  return (
    <div className={`field ${flash.includes(path) ? 'flash' : ''} ${isMissing(value) ? 'missing' : ''}`}>
      <div className="field-head">
        <label>{label}</label>
        {ev.length > 0 && onEvidence && (
          <button type="button" className="link-btn" onClick={() => onEvidence(ev)}>
            <IconLink width={14} height={14} /> ver na transcrição
          </button>
        )}
      </div>
      <AutoArea value={value} disabled={locked} onChange={(v) => onChange(path, v)} />
    </div>
  );
}

function ListEditor({ label, path, items, fields, evidence = EVIDENCE, locked, flash, onChange, onEvidence, makeItem, conflictIds = [], addLabel }) {
  const ev = evidence[path] || [];
  const update = (id, key, v) => onChange(path, items.map((it) => (it.id === id ? { ...it, [key]: v } : it)));
  return (
    <div className={`field ${flash.includes(path) ? 'flash' : ''}`}>
      <div className="field-head">
        <label>{label}</label>
        {ev.length > 0 && onEvidence && (
          <button type="button" className="link-btn" onClick={() => onEvidence(ev)}>
            <IconLink width={14} height={14} /> ver na transcrição
          </button>
        )}
      </div>
      {items.length === 0 && <p className="missing-text">{path === 'p.rx' ? 'Sem prescrição medicamentosa nesta consulta' : 'Nenhum exame solicitado'}</p>}
      <ul className="rows">
        {items.map((it) => (
          <li key={it.id} className={`row ${conflictIds.includes(it.id) ? 'conflict' : ''}`}>
            {fields.map((f) => (
              <input
                key={f.key}
                className={`input ${f.strong ? 'strong' : ''}`}
                value={it[f.key]}
                placeholder={f.placeholder}
                disabled={locked}
                onChange={(e) => update(it.id, f.key, e.target.value)}
              />
            ))}
            {conflictIds.includes(it.id) && <span className="badge badge-critical">Alergia</span>}
            {!locked && (
              <button type="button" className="icon-btn sm" aria-label="Remover" onClick={() => onChange(path, items.filter((x) => x.id !== it.id))}>
                <IconX width={14} height={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
      {!locked && (
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(path, [...items, makeItem()])}>
          <IconPlus width={14} height={14} /> {addLabel}
        </button>
      )}
    </div>
  );
}

export function SafetyAlert({ conflicts, acked, onAck, onFix, locked }) {
  if (!conflicts.length) return null;
  const allergen = conflicts[0].allergen[0].toUpperCase() + conflicts[0].allergen.slice(1);
  if (acked) {
    return (
      <div className="alert acked">
        <IconAlert />
        <div>
          <strong>Alerta de segurança reconhecido pelo médico.</strong>
          <p className="small">
            Paciente com alergia a {allergen}; prescrição mantida por decisão clínica.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="alert" role="alert">
      <IconAlert width={24} height={24} />
      <div className="alert-body">
        <strong>ALERTA DE SEGURANÇA</strong>
        <p>
          O paciente relatou alergia a <b>{allergen}</b>, mas foi identificada a prescrição de{' '}
          <b>{conflicts.map((c) => c.med).join(', ')}</b> no Plano Terapêutico.
        </p>
        {!locked && (
          <div className="alert-actions">
            <button type="button" className="btn btn-black btn-sm" onClick={() => onFix(allergen.toLowerCase())}>
              Resolver com a assistente
            </button>
            <button type="button" className="btn btn-secondary btn-sm" onClick={onAck}>
              Ciente, manter prescrição
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CidRow({ cid, locked, flash, onDecide, onEvidence }) {
  return (
    <li className={`cid ${cid.status.toLowerCase()} ${flash ? 'flash' : ''}`}>
      <span className="cid-code">{cid.code}</span>
      <div className="cid-main">
        <strong>{cid.desc}</strong>
        <p className="muted small">
          <b>Evidência:</b> {cid.quote}{' '}
          {onEvidence && (
            <button type="button" className="link-btn" onClick={() => onEvidence(cid.segs)}>
              <IconLink width={14} height={14} /> ver
            </button>
          )}
        </p>
      </div>
      <div className="cid-actions">
        {cid.status === 'Sugerida' && !locked ? (
          <>
            <button type="button" className="btn btn-sm btn-outline-ok" onClick={() => onDecide(cid.id, 'Aceita')}>
              <IconCheck width={14} height={14} /> Aceitar
            </button>
            <button type="button" className="btn btn-sm btn-outline-no" onClick={() => onDecide(cid.id, 'Rejeitada')}>
              <IconX width={14} height={14} /> Rejeitar
            </button>
          </>
        ) : (
          <>
            <span className={`badge ${cid.status === 'Aceita' ? 'badge-success' : cid.status === 'Rejeitada' ? 'badge-muted' : 'badge-soft'}`}>
              {cid.status}
            </span>
            {!locked && (
              <button type="button" className="link-btn" onClick={() => onDecide(cid.id, 'Sugerida')}>
                desfazer
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function SubjectiveBody({ draft, evidence, locked, flash, onChange, onEvidence }) {
  const common = { draft, evidence, locked, flash, onChange, onEvidence };
  return (
    <div className="acc-fields">
      <Field {...common} label="Queixa principal (QP)" path="s.qp" />
      <Field {...common} label="História da doença atual (HDA)" path="s.hma" />
      <Field {...common} label="Histórico médico pregresso e comorbidades" path="s.hist" />
      <Field {...common} label="Alergias" path="s.alergias" />
      <Field {...common} label="Medicamentos em uso contínuo" path="s.meds" />
      <Field {...common} label="Histórico familiar e hábitos de vida" path="s.habitos" />
    </div>
  );
}

export function ObjectiveBody({ draft, evidence, locked, flash, onChange, onEvidence }) {
  const common = { draft, evidence, locked, flash, onChange, onEvidence };
  return (
    <div className="acc-fields">
      <Field {...common} label="Sinais vitais" path="o.sinais" />
      <Field {...common} label="Exame físico segmentar" path="o.exame" />
      <Field {...common} label="Exames complementares analisados" path="o.comp" />
    </div>
  );
}

export function AssessmentBody({ draft, evidence, locked, flash, onChange, onCid, onAcceptAll, onEvidence }) {
  const common = { draft, evidence, locked, flash, onChange, onEvidence };
  const pending = draft.a.cids.filter((c) => c.status === 'Sugerida').length;
  return (
    <div className="acc-fields">
      <Field {...common} label="Hipótese diagnóstica" path="a.hip" />
      <div className={`field ${flash.includes('a.cids') ? 'flash' : ''}`}>
        <div className="field-head">
          <label>Sugestões de CID-10</label>
          <div className="field-actions">
            <span className="muted small">Aceite ou rejeite cada sugestão (REG-05)</span>
            {!locked && pending > 0 && (
              <button type="button" className="btn btn-sm btn-outline-ok" onClick={onAcceptAll}>
                <IconCheck width={14} height={14} /> Aceitar todos
              </button>
            )}
          </div>
        </div>
        <ul className="cids">
          {draft.a.cids.map((c) => (
            <CidRow key={c.id} cid={c} locked={locked} flash={false} onDecide={onCid} onEvidence={onEvidence} />
          ))}
        </ul>
      </div>
    </div>
  );
}

export function PlanBody({ draft, evidence, locked, flash, conflicts, alertAcked, onAck, onFix, onChange, onEvidence }) {
  const common = { draft, evidence, locked, flash, onChange, onEvidence };
  const conflictIds = conflicts.map((c) => c.rxId);
  const { p } = draft;
  return (
    <div className="acc-fields">
      <SafetyAlert conflicts={conflicts} acked={alertAcked} onAck={onAck} onFix={onFix} locked={locked} />
      <ListEditor
        {...common}
        label="Prescrição de medicamentos"
        path="p.rx"
        items={p.rx}
        conflictIds={conflictIds}
        fields={[
          { key: 'med', placeholder: 'Medicamento e dose', strong: true },
          { key: 'pos', placeholder: 'Posologia, via e duração' },
        ]}
        makeItem={() => ({ id: `rx${Date.now()}`, med: '', pos: '' })}
        addLabel="Adicionar medicamento"
      />
      <ListEditor
        {...common}
        label="Exames solicitados"
        path="p.exames"
        items={p.exames}
        fields={[{ key: 'text', placeholder: 'Exame solicitado', strong: true }]}
        makeItem={() => ({ id: `ex${Date.now()}`, text: '' })}
        addLabel="Adicionar exame"
      />
      <Field {...common} label="Orientações e encaminhamentos" path="p.orient" />
    </div>
  );
}
