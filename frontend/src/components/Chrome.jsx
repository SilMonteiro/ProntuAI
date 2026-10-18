import React, { useEffect, useRef, useState } from 'react';
import { IconBell, IconCheck, Logo, LogoNome } from './Icons.jsx';
import { MEDICO } from '../data/mock.js';

export function TopNav() {
  const tabs = ['Atendimento', 'Agenda', 'Pacientes', 'Histórico'];
  return (
    <header className="nav">
      <div className="nav-inner">
        <div className="brand">
          <Logo />
          <LogoNome />
        </div>
        <nav className="nav-tabs" aria-label="Principal">
          {tabs.map((t, i) => (
            <button key={t} className={`nav-tab ${i === 0 ? 'active' : ''}`} type="button" aria-current={i === 0 ? 'page' : undefined} disabled={i !== 0} title={i === 0 ? undefined : 'Em breve'}>
              {t}
            </button>
          ))}
        </nav>
        <div className="nav-right">
          <button className="icon-btn" type="button" aria-label="Notificações">
            <IconBell />
          </button>
          <div className="avatar sm" title={`${MEDICO.nome} · ${MEDICO.crm}`}>
            {MEDICO.iniciais}
          </div>
        </div>
      </div>
    </header>
  );
}

const CONSULTA_BADGE = {
  EmAndamento: ['badge-warning', 'Consulta em andamento'],
  AguardandoRevisao: ['badge-attention', 'Aguardando revisão'],
  Finalizada: ['badge-success', 'Consulta finalizada'],
};

export function PatientHeader({ consulta, dataHora, patient, patients, onSelect }) {
  const [cls, label] = CONSULTA_BADGE[consulta];
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (!boxRef.current?.contains(e.target)) setOpen(false);
    };
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <section className="card patient">
      <div className="avatar">{patient.iniciais}</div>
      <div className="patient-main">
        <div className="patient-select" ref={boxRef}>
          <button
            type="button"
            className="patient-switch"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label="Trocar paciente"
            onClick={() => setOpen(!open)}
          >
            <h1 className="h-sm">{patient.nome}</h1>
            <i className="chev" aria-hidden="true" />
          </button>
          {open && (
            <ul className="patient-menu" role="listbox" aria-label="Pacientes">
              {patients.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={p.id === patient.id}
                    className={p.id === patient.id ? 'current' : ''}
                    onClick={() => {
                      setOpen(false);
                      if (p.id !== patient.id) onSelect(p.id);
                    }}
                  >
                    <span className="avatar xs">{p.iniciais}</span>
                    <span className="pm-text">
                      <strong>{p.nome}</strong>
                      <span className="muted small">{p.rotulo}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="muted">
          {patient.idade} anos · {patient.sexo} · Prontuário nº {patient.id} · {patient.convenio} · Última consulta{' '}
          {patient.ultimaConsulta}
        </p>
      </div>
      <div className="patient-side">
        <span className={`badge ${cls}`}>{label}</span>
        <p className="muted small">
          {MEDICO.nome} · {MEDICO.crm}
          {dataHora ? ` · ${dataHora}` : ''}
        </p>
      </div>
    </section>
  );
}

const STEPS = ['Gravação', 'Transcrição', 'Rascunho da IA', 'Revisão e homologação'];

export function Stepper({ current }) {
  return (
    <ol className="stepper" aria-label="Etapas do atendimento">
      {STEPS.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'todo';
        return (
          <li key={label} className={`step ${state}`}>
            <span className="step-dot">{state === 'done' ? <IconCheck width={14} height={14} strokeWidth={3} /> : i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
