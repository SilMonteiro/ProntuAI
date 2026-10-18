import React, { useState } from 'react';
import { IconCheck } from './Icons.jsx';

// Histórico de consultas e prontuários anteriores do paciente (dados mockados).
export default function HistoryView({ mode, consultas, patient, onBack }) {
  const [openId, setOpenId] = useState(consultas[0]?.id ?? null);
  const historico = mode === 'historico';
  const title = historico ? 'Histórico de consultas' : 'Prontuários anteriores';
  const sub = historico
    ? `${consultas.length} consulta${consultas.length === 1 ? '' : 's'} registrada${consultas.length === 1 ? '' : 's'} para ${patient.nome}`
    : `Prontuários homologados de ${patient.nome}`;

  return (
    <section className="history">
      <header className="history-head">
        <button type="button" className="back-link" onClick={onBack}>← Voltar ao atendimento</button>
        <div>
          <h2 className="h-sm">{title}</h2>
          <p className="muted small">{sub}</p>
        </div>
      </header>

      {consultas.length === 0 ? (
        <div className="card history-empty">
          <p className="h-sm">Nenhum registro anterior</p>
          <p className="muted">Este paciente ainda não tem consultas anteriores. As consultas homologadas aparecerão aqui.</p>
        </div>
      ) : (
        <ol className="timeline">
          {consultas.map((c) => {
            const open = openId === c.id;
            return (
              <li key={c.id} className={`tl-item ${open ? 'open' : ''}`}>
                <button type="button" className="tl-head" aria-expanded={open} onClick={() => setOpenId(open ? null : c.id)}>
                  <div className="tl-date">
                    <strong>{c.data}</strong>
                    <span className="muted small">{c.hora}</span>
                  </div>
                  <div className="tl-main">
                    <strong>{c.motivo}</strong>
                    <span className="muted small">{c.medico}</span>
                  </div>
                  <div className="tl-cids">
                    {c.cids.map((code) => (
                      <span key={code} className="cid-code">{code}</span>
                    ))}
                  </div>
                  <span className="badge badge-success"><IconCheck width={12} height={12} strokeWidth={3} /> Homologado</span>
                  <span className="expand">
                    {open ? 'Recolher' : 'Expandir'}
                    <i className="chev" />
                  </span>
                </button>
                {open && (
                  <div className="tl-body">
                    {historico ? (
                      <p className="tl-resumo">{c.resumo}</p>
                    ) : (
                      <div className="tl-soap">
                        {c.soap.map((sec) => (
                          <div key={sec.letra} className="tl-sec">
                            <h4><span className="tl-letra">{sec.letra}</span> {sec.titulo}</h4>
                            {sec.itens.map(([label, text]) => (
                              <p key={label}><b>{label}:</b> {text}</p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
