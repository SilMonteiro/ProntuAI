import React, { useEffect, useRef } from 'react';
import { SEGMENTS } from '../data/mock.js';
import { fmtTime } from '../lib/draft.js';

function renderText(seg, showTerms) {
  if (!showTerms || !seg.terms.length) return seg.text;
  let nodes = [seg.text];
  seg.terms.forEach((t, ti) => {
    nodes = nodes.flatMap((n) => {
      if (typeof n !== 'string') return [n];
      const i = n.indexOf(t.raw);
      if (i < 0) return [n];
      return [
        n.slice(0, i),
        <mark key={`${seg.id}-${ti}`} className="term" title={`Termo médico: ${t.med}`}>
          {t.raw}
          <span className="term-tip">→ {t.med}</span>
        </mark>,
        n.slice(i + t.raw.length),
      ];
    });
  });
  return nodes;
}

// mode: 'live' (revela conforme o áudio), 'full' (replay) ou 'review' (mostra filtros/termos)
export default function TranscriptView({ mode, pos = 0, highlight = [], onSeek, status }) {
  const boxRef = useRef(null);

  const visible = mode === 'live' ? SEGMENTS.filter((s) => s.start <= pos) : SEGMENTS;
  const active = [...SEGMENTS].reverse().find((s) => s.start <= pos);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    if (mode === 'live') {
      box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
    } else if (mode === 'full' && active) {
      const el = box.querySelector(`[data-seg="${active.id}"]`);
      if (el) box.scrollTo({ top: el.offsetTop - 120, behavior: 'smooth' });
    }
  }, [mode, active?.id, visible.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const box = boxRef.current;
    if (!box || !highlight.length) return;
    const el = box.querySelector(`[data-seg="${highlight[0]}"]`);
    if (el) box.scrollTo({ top: el.offsetTop - 80, behavior: 'smooth' });
  }, [highlight]);

  return (
    <div className="transcript" ref={boxRef}>
      {visible.length === 0 && (
        <div className="empty">
          <p className="h-sm">A transcrição aparecerá aqui</p>
          <p className="muted">Inicie a gravação para capturar a conversa. Os turnos de fala do médico e do paciente são identificados automaticamente.</p>
        </div>
      )}

      {visible.map((seg) => {
        const typing = mode === 'live' && active?.id === seg.id && pos < seg.start + seg.dur;
        const text = typing ? seg.text.slice(0, Math.ceil((seg.text.length * (pos - seg.start)) / seg.dur)) : seg.text;
        const filtered = mode === 'review' && !seg.clinical;
        const isHl = highlight.includes(seg.id);
        const isActive = mode === 'full' && active?.id === seg.id && pos > 0;
        return (
          <div
            key={seg.id}
            data-seg={seg.id}
            className={`line ${seg.speaker === 'M' ? 'doc' : 'pat'} ${filtered ? 'filtered' : ''} ${isHl ? 'hl' : ''} ${isActive ? 'now' : ''}`}
            onClick={onSeek ? () => onSeek(seg.start) : undefined}
          >
            <div className="who">
              <span className="who-dot">{seg.speaker === 'M' ? 'Dra' : 'Pac'}</span>
              <span className="time">{fmtTime(seg.start)}</span>
            </div>
            <div className="bubble">
              <p>
                {typing ? text : renderText(seg, mode === 'review')}
                {typing && <i className="caret" />}
              </p>
              {filtered && <span className="badge badge-soft">Amenidade filtrada · REG-03</span>}
            </div>
          </div>
        );
      })}

      {status && (
        <div className="transcript-foot muted small">Status da transcrição: {status}</div>
      )}
    </div>
  );
}
