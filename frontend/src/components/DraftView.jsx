import React, { useLayoutEffect, useRef, useState } from 'react';
import { EVIDENCE } from '../data/mock.js';
import { getIn, isMissing } from '../lib/draft.js';
import { IconAlert, IconCheck, IconLink, IconLock, IconPlus, IconX } from './Icons.jsx';

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

function Field({ label, path, draft, locked, flash, onChange, onEvidence }) {
  const value = getIn(draft, path);
  const ev = EVIDENCE[path] || [];
  return (
    <div className={`field ${flash.includes(path) ? 'flash' : ''} ${isMissing(value) ? 'missing' : ''}`}>
      <div className="field-head">
        <label>{label}</label>
        {ev.length > 0 && (
          <button type="button" className="link-btn" onClick={() => onEvidence(ev)}>
            <IconLink width={14} height={14} /> ver na transcrição
          </button>
        )}
      </div>
      <AutoArea value={value} disabled={locked} onChange={(v) => onChange(path, v)} />
    </div>
  );
}

function Section({ letter, title, subtitle, summary, prefix, flash = [], defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const flashing = prefix && flash.some((f) => f.startsWith(prefix));
  return (
    <section className={`card soap ${open ? 'open' : ''} ${flashing ? 'sec-flash' : ''}`}>
      <button type="button" className="soap-head" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span className="soap-letter">{letter}</span>
        <div className="soap-title">
          <h3 className="h-sm">{title}</h3>
          <p className="muted small">{subtitle}</p>
        </div>
        <span className="expand">{open ? 'Recolher' : 'Expandir'}<i className="chev" /></span>
      </button>
      {open ? <div className="soap-body">{children}</div> : <div className="soap-summary">{summary}</div>}
    </section>
  );
}

function ListEditor({ label, path, items, fields, locked, flash, onChange, onEvidence, makeItem, conflictIds = [], addLabel }) {
  const ev = EVIDENCE[path] || [];
  const update = (id, key, v) => onChange(path, items.map((it) => (it.id === id ? { ...it, [key]: v } : it)));
  return (
    <div className={`field ${flash.includes(path) ? 'flash' : ''}`}>
      <div className="field-head">
        <label>{label}</label>
        {ev.length > 0 && (
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
          <button type="button" className="link-btn" onClick={() => onEvidence(cid.segs)}>
            <IconLink width={14} height={14} /> ver
          </button>
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

const clip = (s, n = 140) => (s.length > n ? `${s.slice(0, n).trim()}…` : s);

function Sum({ label, children }) {
  return (
    <p className="sum">
      <b>{label}</b> <span>{children}</span>
    </p>
  );
}

export function DraftLeft({ draft, locked, flash, conflictIds = [], onChange, onEvidence }) {
  const common = { draft, locked, flash, onChange, onEvidence };
  const { s, o, p, ident } = draft;
  return (
    <div className="draft">
      <Section letter="S" title="Subjetivo" subtitle="Relato do paciente e anamnese" prefix="s." flash={flash} defaultOpen
        summary={<>
          <Sum label="QP">{s.qp}</Sum>
          <Sum label="HMA">{clip(s.hma, 170)}</Sum>
          <Sum label="Alergias">{s.alergias}</Sum>
          <Sum label="Em uso">{clip(s.meds, 90)}</Sum>
        </>}>
        <Field {...common} label="Queixa principal (QP)" path="s.qp" />
        <Field {...common} label="História da moléstia atual (HMA)" path="s.hma" />
        <Field {...common} label="Histórico médico pregresso e comorbidades" path="s.hist" />
        <Field {...common} label="Alergias" path="s.alergias" />
        <Field {...common} label="Medicamentos em uso contínuo" path="s.meds" />
        <Field {...common} label="Histórico familiar e hábitos de vida" path="s.habitos" />
      </Section>

      <Section letter="O" title="Objetivo" subtitle="Exame físico e achados clínicos" prefix="o." flash={flash}
        summary={<>
          <Sum label="Sinais vitais">{clip(o.sinais, 110)}</Sum>
          <Sum label="Exame físico">{clip(o.exame, 110)}</Sum>
        </>}>
        <Field {...common} label="Sinais vitais" path="o.sinais" />
        <Field {...common} label="Exame físico segmentar" path="o.exame" />
        <Field {...common} label="Exames complementares analisados" path="o.comp" />
      </Section>

      <Section letter="P" title="Plano terapêutico" subtitle="Conduta, prescrição e orientações" prefix="p." flash={flash}
        summary={<>
          <Sum label="Prescrição">{p.rx.length ? p.rx.map((r) => r.med).join(' · ') : 'Sem prescrição medicamentosa nesta consulta'}</Sum>
          <Sum label="Exames">{p.exames.length ? p.exames.map((e) => e.text).join(' · ') : 'Nenhum exame solicitado'}</Sum>
          <Sum label="Orientações">{clip(p.orient, 110)}</Sum>
        </>}>
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
      </Section>

      <Section letter="ID" title="Identificação" subtitle="Dados do paciente e da consulta" prefix="ident." flash={flash}
        summary={<Sum label="Paciente">{ident.nome} · {ident.idade} · {ident.dataHora}</Sum>}>
        <div className="grid-2">
          <div className="field">
            <div className="field-head"><label>Nome</label></div>
            <input className="input" value={ident.nome} disabled={locked} onChange={(e) => onChange('ident.nome', e.target.value)} />
          </div>
          <div className="field">
            <div className="field-head"><label>Idade</label></div>
            <input className="input" value={ident.idade} disabled={locked} onChange={(e) => onChange('ident.idade', e.target.value)} />
          </div>
        </div>
        <div className="field">
          <div className="field-head"><label>Data e hora da consulta</label></div>
          <input className="input" value={ident.dataHora} disabled />
        </div>
      </Section>
    </div>
  );
}

export function DraftCenter({ draft, locked, flash, onChange, onCid, onEvidence }) {
  const common = { draft, locked, flash, onChange, onEvidence };
  const pending = draft.a.cids.filter((c) => c.status === 'Sugerida').length;
  return (
    <section className="card soap emph">
      <header className="soap-head static">
        <span className="soap-letter">A</span>
        <div className="soap-title">
          <h3 className="h-sm">Avaliação</h3>
          <p className="muted small">Impressão diagnóstica e CID-10</p>
        </div>
        {!locked && pending > 0 && <span className="badge badge-attention">{pending} CID pendente{pending > 1 ? 's' : ''}</span>}
      </header>
      <div className="soap-body">
        <Field {...common} label="Hipótese diagnóstica" path="a.hip" />
        <div className={`field ${flash.includes('a.cids') ? 'flash' : ''}`}>
          <div className="field-head">
            <label>Sugestões de CID-10</label>
            <span className="muted small">Aceite ou rejeite cada sugestão (REG-05)</span>
          </div>
          <ul className="cids">
            {draft.a.cids.map((c) => (
              <CidRow key={c.id} cid={c} locked={locked} flash={false} onDecide={onCid} onEvidence={onEvidence} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
