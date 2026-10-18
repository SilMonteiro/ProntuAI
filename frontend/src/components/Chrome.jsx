import React from 'react';
import { IconBell, IconCheck, Logo, LogoNome } from './Icons.jsx';
import { MEDICO, PACIENTE } from '../data/mock.js';

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

export function PatientHeader({ consulta, dataHora }) {
  const [cls, label] = CONSULTA_BADGE[consulta];
  return (
    <section className="card patient">
      <div className="avatar">{PACIENTE.iniciais}</div>
      <div className="patient-main">
        <h1 className="h-sm">{PACIENTE.nome}</h1>
        <p className="muted">
          {PACIENTE.idade} anos · {PACIENTE.sexo} · Prontuário nº {PACIENTE.id} · {PACIENTE.convenio} · Última consulta{' '}
          {PACIENTE.ultimaConsulta}
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
