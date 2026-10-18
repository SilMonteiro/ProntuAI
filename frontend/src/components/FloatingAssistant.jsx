import React, { useEffect, useRef, useState } from 'react';
import ChatPanel from './ChatPanel.jsx';
import TranscriptView from './TranscriptView.jsx';
import { IconSparkle, IconX } from './Icons.jsx';

// Assistente IA minimizável no canto inferior direito, com a transcrição para conferir evidências.
export default function FloatingAssistant({
  open,
  setOpen,
  tab,
  setTab,
  messages,
  typing,
  locked,
  onSend,
  prefill,
  onPrefillUsed,
  segments,
  highlight,
}) {
  const [unread, setUnread] = useState(0);
  const seen = useRef(messages.length);

  useEffect(() => {
    const added = messages.length - seen.current;
    seen.current = messages.length;
    if (added > 0 && !open) setUnread((u) => u + added);
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  return (
    <>
      {open && (
        <section className="assist-panel card" role="dialog" aria-label="Assistente IA">
          <header className="assist-head">
            <div className="side-tabs">
              <button type="button" className={`pill-tab sm ${tab === 'chat' ? 'active' : ''}`} onClick={() => setTab('chat')}>
                <IconSparkle width={14} height={14} /> Assistente IA
              </button>
              <button type="button" className={`pill-tab sm ${tab === 'transcript' ? 'active' : ''}`} onClick={() => setTab('transcript')}>
                Transcrição
              </button>
            </div>
            <button type="button" className="icon-btn sm" aria-label="Minimizar assistente" onClick={() => setOpen(false)}>
              <IconX width={14} height={14} />
            </button>
          </header>
          <div className="assist-body">
            {tab === 'chat' ? (
              <ChatPanel
                messages={messages}
                typing={typing}
                locked={locked}
                onSend={onSend}
                prefill={prefill}
                onPrefillUsed={onPrefillUsed}
              />
            ) : (
              <div className="side-transcript">
                <p className="muted small legend">
                  <mark className="term">termo popular</mark> → termo médico · trechos esmaecidos foram filtrados da nota.
                </p>
                <TranscriptView mode="review" highlight={highlight} segments={segments} />
              </div>
            )}
          </div>
        </section>
      )}
      <button
        type="button"
        className="assist-fab"
        aria-label={open ? 'Fechar assistente' : 'Abrir assistente IA'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <IconSparkle width={22} height={22} />
        {!open && unread > 0 && <span className="assist-badge">{unread}</span>}
      </button>
    </>
  );
}
