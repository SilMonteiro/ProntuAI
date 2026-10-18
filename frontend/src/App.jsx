import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopNav, PatientHeader, Stepper } from './components/Chrome.jsx';
import Recorder from './components/Recorder.jsx';
import TranscriptView from './components/TranscriptView.jsx';
import GeneratingView from './components/GeneratingView.jsx';
import DraftView from './components/DraftView.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import { IconCheck, IconLock, IconPrint, IconSparkle } from './components/Icons.jsx';
import { usePlayback } from './hooks/usePlayback.js';
import { buildInitialDraft, DURATION, MEDICO, SEGMENTS } from './data/mock.js';
import { findAllergyConflicts, fmtDateTime, pendencias, setIn } from './lib/draft.js';
import { respond } from './lib/chatEngine.js';

const WELCOME = {
  role: 'ai',
  text: 'Rascunho pronto. Filtrei as amenidades, traduzi a linguagem popular e sugeri 3 CIDs. Encontrei **1 alerta de segurança** na prescrição. Peça os ajustes por aqui — nada vira registro final sem a sua homologação.',
};

export default function App() {
  const [phase, setPhase] = useState('idle'); // idle | recording | recorded | generating | review
  const [transcriptionStatus, setTranscriptionStatus] = useState(null); // Gravando | Processando | Concluida
  const [voiceOn, setVoiceOn] = useState(false);
  const [startedAt, setStartedAt] = useState(null);

  const [draft, setDraft] = useState(null);
  const [flash, setFlash] = useState([]);
  const [ackedKey, setAckedKey] = useState(null);
  const [reviewed, setReviewed] = useState(false);

  const [rightTab, setRightTab] = useState('chat');
  const [highlight, setHighlight] = useState([]);
  const [messages, setMessages] = useState([WELCOME]);
  const [typing, setTyping] = useState(false);
  const [prefill, setPrefill] = useState('');
  const [toast, setToast] = useState(null);
  const draftRef = useRef(null);
  draftRef.current = draft;

  const finishRecording = useCallback(() => {
    setPhase('recorded');
    setTranscriptionStatus('Processando');
    setTimeout(() => setTranscriptionStatus('Concluida'), 1400);
  }, []);
  const pb = usePlayback(DURATION, () => {
    if (phase === 'recording') finishRecording();
  });

  /* ---------- áudio / voz sintética ---------- */
  const active = useMemo(() => [...SEGMENTS].reverse().find((s) => s.start <= pb.pos), [pb.pos]);
  useEffect(() => {
    if (!('speechSynthesis' in window)) return undefined;
    window.speechSynthesis.cancel();
    if (!pb.playing || !voiceOn || !active) return undefined;
    const u = new SpeechSynthesisUtterance(active.text);
    u.lang = 'pt-BR';
    u.rate = Math.min(1.6, 0.95 + pb.speed * 0.15);
    u.pitch = active.speaker === 'M' ? 0.9 : 1.25;
    window.speechSynthesis.speak(u);
    return () => window.speechSynthesis.cancel();
  }, [active?.id, pb.playing, voiceOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2400);
  };

  /* ---------- fluxo de gravação (FL-01 / FL-02) ---------- */
  const start = () => {
    setStartedAt(new Date());
    setPhase('recording');
    setTranscriptionStatus('Gravando');
    pb.reset();
    setTimeout(pb.play, 50);
  };
  const stop = () => {
    pb.pause();
    pb.seek(DURATION);
    finishRecording();
  };
  const skip = () => {
    pb.seek(DURATION - 0.3);
  };
  const generate = () => {
    pb.pause();
    setPhase('generating');
  };
  const onGenerated = useCallback(() => {
    setDraft(buildInitialDraft(fmtDateTime(startedAt || new Date())));
    setMessages([WELCOME]);
    setRightTab('chat');
    setPhase('review');
  }, [startedAt]);

  /* ---------- edição do prontuário (FL-03) ---------- */
  const locked = draft?.status === 'Homologado';
  const touch = (d) => (d.status === 'Rascunho' ? { ...d, status: 'EmRevisao' } : d);
  const flashPaths = (paths) => {
    setFlash(paths);
    setTimeout(() => setFlash([]), 1800);
  };

  const onChange = (path, value) => setDraft((d) => touch(setIn(d, path, value)));
  const onCid = (id, status) =>
    setDraft((d) => touch({ ...d, a: { ...d.a, cids: d.a.cids.map((c) => (c.id === id ? { ...c, status } : c)) } }));

  const conflicts = useMemo(() => (draft ? findAllergyConflicts(draft) : []), [draft]);
  const conflictKey = conflicts.map((c) => `${c.rxId}:${c.med}`).join('|');
  const alertAcked = conflicts.length > 0 && ackedKey === conflictKey;
  const alertOk = conflicts.length === 0 || alertAcked;

  const showEvidence = (ids) => {
    setHighlight(ids);
    setRightTab('transcript');
  };

  const send = (text) => {
    setMessages((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    setTimeout(() => {
      const res = respond(text, draftRef.current);
      setTyping(false);
      setMessages((m) => [
        ...m,
        { role: 'ai', text: res.reply },
        ...(res.log ? [{ role: 'system', text: `Alteração aplicada — ${res.log}` }] : []),
      ]);
      if (res.changed.length) {
        setDraft(touch(res.draft));
        flashPaths(res.changed);
      }
    }, 900);
  };

  /* ---------- homologação (FL-04) ---------- */
  const pend = draft ? pendencias(draft, { alertOk, reviewed }) : [];
  const homologar = () => {
    window.speechSynthesis?.cancel();
    setDraft((d) => ({ ...d, status: 'Homologado', homologadoEm: fmtDateTime(new Date()), assinatura: Math.random().toString(16).slice(2, 10).toUpperCase() }));
    setRightTab('transcript');
    setHighlight([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const restart = () => {
    window.speechSynthesis?.cancel();
    pb.reset();
    setDraft(null);
    setPhase('idle');
    setTranscriptionStatus(null);
    setReviewed(false);
    setAckedKey(null);
    setHighlight([]);
    setMessages([WELCOME]);
  };

  /* ---------- derivados de UI ---------- */
  const consulta = locked ? 'Finalizada' : phase === 'review' ? 'AguardandoRevisao' : 'EmAndamento';
  const stepIdx = locked ? 4 : phase === 'review' ? 3 : phase === 'generating' ? 2 : phase === 'recorded' ? 1 : 0;
  const inReview = phase === 'review' && draft;

  return (
    <>
      <TopNav />
      <main className="page">
        <PatientHeader consulta={consulta} dataHora={startedAt ? fmtDateTime(startedAt) : null} />
        <Stepper current={stepIdx} />

        {!inReview && phase !== 'generating' && (
          <div className="grid-main">
            <Recorder
              phase={phase}
              pb={pb}
              voiceOn={voiceOn}
              setVoiceOn={setVoiceOn}
              onStart={start}
              onStop={stop}
              onSkip={skip}
              onGenerate={generate}
              transcriptionStatus={transcriptionStatus}
            />
            <section className="card transcript-card">
              <div className="card-head">
                <div>
                  <h2 className="h-sm">Transcrição</h2>
                  <p className="muted small">Médico × Paciente, com identificação de locutor</p>
                </div>
                {transcriptionStatus && (
                  <span className={`badge ${transcriptionStatus === 'Concluida' ? 'badge-success' : transcriptionStatus === 'Gravando' ? 'badge-critical' : 'badge-attention'}`}>
                    {transcriptionStatus === 'Concluida' ? 'Concluída' : transcriptionStatus}
                  </span>
                )}
              </div>
              <TranscriptView
                mode={phase === 'recording' ? 'live' : phase === 'idle' ? 'live' : 'full'}
                pos={phase === 'recording' || phase === 'idle' || pb.pos < DURATION ? pb.pos : 0}
                onSeek={phase === 'recorded' ? pb.seek : undefined}
              />
            </section>
          </div>
        )}

        {phase === 'generating' && <GeneratingView onDone={onGenerated} />}

        {inReview && (
          <>
            {locked && (
              <div className="banner-ok">
                <IconLock />
                <div>
                  <strong>Prontuário homologado</strong>
                  <p className="small">
                    {MEDICO.nome} · {MEDICO.crm} · {draft.homologadoEm} · assinatura #{draft.assinatura}. Registro imutável salvo no histórico do paciente; áudio bruto descartado.
                  </p>
                </div>
                <div className="banner-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => window.print()}>
                    <IconPrint /> Exportar
                  </button>
                  <button type="button" className="btn btn-black btn-sm" onClick={restart}>
                    Nova consulta
                  </button>
                </div>
              </div>
            )}

            <div className="status-track" aria-label="Estado do prontuário">
              {['Rascunho', 'EmRevisao', 'Homologado'].map((s, i, arr) => {
                const idx = arr.indexOf(draft.status);
                return (
                  <React.Fragment key={s}>
                    <span className={`st ${i < idx ? 'done' : i === idx ? 'cur' : ''}`}>{s === 'EmRevisao' ? 'Em revisão' : s}</span>
                    {i < arr.length - 1 && <i className="st-line" />}
                  </React.Fragment>
                );
              })}
            </div>

            <div className="grid-review">
              <DraftView
                draft={draft}
                locked={locked}
                flash={flash}
                conflicts={conflicts}
                ackedAlert={alertAcked}
                onAck={() => {
                  setAckedKey(conflictKey);
                  setDraft(touch);
                }}
                onFixAlert={(drug) => {
                  setRightTab('chat');
                  setPrefill(`Substitua a ${drug} por paracetamol 750 mg`);
                }}
                onChange={onChange}
                onCid={onCid}
                onEvidence={showEvidence}
              />

              <aside className="side">
                <div className="side-inner card">
                  <div className="side-tabs">
                    <button type="button" className={`pill-tab ${rightTab === 'chat' ? 'active' : ''}`} onClick={() => setRightTab('chat')}>
                      <IconSparkle width={14} height={14} /> Assistente IA
                    </button>
                    <button type="button" className={`pill-tab ${rightTab === 'transcript' ? 'active' : ''}`} onClick={() => setRightTab('transcript')}>
                      Transcrição
                    </button>
                  </div>
                  {rightTab === 'chat' ? (
                    <ChatPanel
                      messages={messages}
                      typing={typing}
                      locked={locked}
                      onSend={send}
                      prefill={prefill}
                      onPrefillUsed={() => setPrefill('')}
                    />
                  ) : (
                    <div className="side-transcript">
                      <p className="muted small legend">
                        <mark className="term">termo popular</mark> → termo médico · trechos esmaecidos foram filtrados da nota.
                      </p>
                      <TranscriptView mode="review" highlight={highlight} />
                    </div>
                  )}
                </div>
              </aside>
            </div>

            {!locked && (
              <div className="actionbar">
                <label className="check">
                  <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
                  <span>Revisei todo o conteúdo gerado pela IA e assumo a responsabilidade clínica pelo registro.</span>
                </label>
                <div className="actionbar-right">
                  <span className="pend small">
                    {pend.length ? `Pendências: ${pend.join(' · ')}` : <><IconCheck width={14} height={14} /> Pronto para homologar</>}
                  </span>
                  <button type="button" className="btn btn-ghost" onClick={() => notify('Rascunho salvo no histórico da consulta')}>
                    Salvar rascunho
                  </button>
                  {draft.status === 'Rascunho' && (
                    <button type="button" className="btn btn-secondary" onClick={() => setDraft(touch)}>
                      Iniciar revisão
                    </button>
                  )}
                  <button type="button" className="btn btn-cobalt" disabled={pend.length > 0} onClick={homologar}>
                    Homologar prontuário
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
