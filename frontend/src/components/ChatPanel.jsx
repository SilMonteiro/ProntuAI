import React, { useEffect, useRef, useState } from 'react';
import { IconSend, IconSparkle } from './Icons.jsx';
import { SUGGESTIONS } from '../lib/chatEngine.js';

// Markdown mínimo: **negrito** e *itálico*
function Rich({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('*') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function ChatPanel({ messages, typing, locked, onSend, prefill, onPrefillUsed }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (prefill) {
      setText(prefill);
      onPrefillUsed();
    }
  }, [prefill, onPrefillUsed]);

  const submit = (v) => {
    const msg = (v ?? text).trim();
    if (!msg || locked) return;
    onSend(msg);
    setText('');
  };

  return (
    <div className="chat">
      <div className="chat-list" ref={listRef}>
        {messages.map((m, i) =>
          m.role === 'system' ? (
            <div key={i} className="chat-sys">{m.text}</div>
          ) : (
            <div key={i} className={`msg ${m.role}`}>
              {m.role === 'ai' && (
                <span className="ai-av"><IconSparkle width={14} height={14} /></span>
              )}
              <div className="msg-bubble"><Rich text={m.text} /></div>
            </div>
          ),
        )}
        {typing && (
          <div className="msg ai">
            <span className="ai-av"><IconSparkle width={14} height={14} /></span>
            <div className="msg-bubble typing"><i /><i /><i /></div>
          </div>
        )}
      </div>

      {!locked && (
        <div className="chips">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="chip" onClick={() => submit(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={locked ? 'Prontuário homologado — edição bloqueada' : 'Peça um ajuste ao rascunho…'}
          disabled={locked}
          aria-label="Mensagem para a assistente"
        />
        <button type="submit" className="send" disabled={locked || !text.trim()} aria-label="Enviar">
          <IconSend />
        </button>
      </form>
    </div>
  );
}
