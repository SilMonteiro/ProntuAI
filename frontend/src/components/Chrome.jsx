import React, { useEffect, useRef, useState } from 'react';
import { IconBell, IconCheck, Logo, LogoNome } from './Icons.jsx';
import { MEDICO } from '../data/mock.js';

const THEME_KEY = 'prontuai:tema';

// Tema claro/escuro no <html data-theme>. A impressão sempre usa o tema claro.
function useTheme() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      /* armazenamento indisponível: vale só nesta sessão */
    }
  }, [theme]);

  useEffect(() => {
    const before = () => {
      document.documentElement.dataset.theme = 'light';
    };
    const after = () => {
      document.documentElement.dataset.theme = theme;
    };
    window.addEventListener('beforeprint', before);
    window.addEventListener('afterprint', after);
    return () => {
      window.removeEventListener('beforeprint', before);
      window.removeEventListener('afterprint', after);
    };
  }, [theme]);

  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))];
}

const sunIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
const moonIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </svg>
);

export function TopNav() {
  const [theme, toggleTheme] = useTheme();
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
          <button
            className="icon-btn theme-toggle"
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          >
            {theme === 'dark' ? sunIcon : moonIcon}
          </button>
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
