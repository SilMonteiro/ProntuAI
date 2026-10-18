import React, { useEffect, useState } from 'react';
import { IconCheck } from './Icons.jsx';
import { PROCESSING_STATS } from '../data/mock.js';

const STEPS = [
  { label: 'Separando falas por locutor', detail: 'Médico e paciente' },
  { label: 'Filtrando amenidades', detail: `${PROCESSING_STATS.filtrados} trechos não clínicos descartados` },
  { label: 'Traduzindo linguagem popular', detail: `${PROCESSING_STATS.termos} expressões convertidas em termos médicos` },
  { label: 'Estruturando em SOAP', detail: 'Campos ausentes marcados como “Não mencionado”' },
  { label: 'Sugerindo CID-10', detail: 'Com evidência extraída da transcrição' },
  { label: 'Verificando alertas de segurança', detail: 'Alergias × prescrição' },
];

export default function GeneratingView({ onDone }) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (n >= STEPS.length) {
      const id = setTimeout(onDone, 600);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setN((x) => x + 1), 750);
    return () => clearTimeout(id);
  }, [n, onDone]);

  return (
    <section className="card gen">
      <div className="gen-orb" aria-hidden="true" />
      <h2 className="h-md">A assistente está elaborando o rascunho…</h2>
      <p className="muted">Nada será inventado: apenas o que foi dito na consulta entra no prontuário.</p>
      <ul className="gen-steps">
        {STEPS.map((s, i) => {
          const state = i < n ? 'done' : i === n ? 'run' : 'todo';
          return (
            <li key={s.label} className={state}>
              <span className="gen-mark">{state === 'done' ? <IconCheck width={14} height={14} strokeWidth={3} /> : state === 'run' ? <i className="spin" /> : null}</span>
              <div>
                <strong>{s.label}</strong>
                {state === 'done' && <span className="muted small"> — {s.detail}</span>}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
