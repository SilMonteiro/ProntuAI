import React, { useEffect, useState } from 'react';
import { IconCheck } from './Icons.jsx';

function buildSteps(stats) {
  return [
    { label: 'Separando falas por locutor', detail: 'Médico e paciente' },
    { label: 'Filtrando amenidades', detail: stats ? `${stats.filtrados} trechos não clínicos descartados` : 'Trechos não clínicos descartados' },
    { label: 'Traduzindo linguagem popular', detail: stats ? `${stats.termos} expressões convertidas em termos médicos` : 'Expressões convertidas em termos médicos' },
    { label: 'Estruturando em SOAP', detail: 'Campos ausentes marcados como “Não mencionado”' },
    { label: 'Sugerindo CID-10', detail: 'Com evidência extraída da transcrição' },
    { label: 'Verificando alertas de segurança', detail: 'Alergias × prescrição' },
  ];
}

// ready=false mantém a última etapa em andamento até a IA responder.
export default function GeneratingView({ onDone, ready = true, error, stats, onRetry, onCancel }) {
  const [n, setN] = useState(0);
  const steps = buildSteps(stats);

  useEffect(() => {
    if (error) return undefined;
    if (n >= steps.length) {
      const id = setTimeout(onDone, 600);
      return () => clearTimeout(id);
    }
    if (n === steps.length - 1 && !ready) return undefined;
    const id = setTimeout(() => setN((x) => x + 1), 750);
    return () => clearTimeout(id);
  }, [n, onDone, ready, error, steps.length]);

  return (
    <section className="card gen">
      {!error && <div className="gen-orb" aria-hidden="true" />}
      <h2 className="h-md">{error ? 'Não foi possível elaborar o rascunho' : 'A assistente está elaborando o rascunho…'}</h2>
      <p className="muted">
        {error || 'Nada será inventado: apenas o que foi dito na consulta entra no prontuário.'}
      </p>
      {error ? (
        <div className="controls">
          <button type="button" className="btn btn-cobalt" onClick={onRetry}>Tentar novamente</button>
          <button type="button" className="btn btn-ghost" onClick={onCancel}>Voltar à transcrição</button>
        </div>
      ) : (
        <ul className="gen-steps">
          {steps.map((s, i) => {
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
      )}
    </section>
  );
}
