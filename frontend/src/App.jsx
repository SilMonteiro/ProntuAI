import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TopNav, PatientHeader, Stepper } from './components/Chrome.jsx';
import Recorder from './components/Recorder.jsx';
import TranscriptView from './components/TranscriptView.jsx';
import GeneratingView from './components/GeneratingView.jsx';
import ReviewFlow from './components/ReviewFlow.jsx';
import FloatingAssistant from './components/FloatingAssistant.jsx';
import { IconCheck } from './components/Icons.jsx';
import FinalView from './components/FinalView.jsx';
import { usePlayback } from './hooks/usePlayback.js';
import { useMicRecorder } from './hooks/useMicRecorder.js';
import { transcribeAudio, toSegments } from './services/api.js';
import { askAssistant } from './services/assistant.js';
import { generateDraft } from './services/prontuario.js';
import { buildInitialDraft, DURATION, EVIDENCE, PACIENTES, PROCESSING_STATS, SEGMENTS } from './data/mock.js';
import { HISTORICO } from './data/historico.js';
import HistoryView from './components/HistoryView.jsx';
import { findAllergyConflicts, fmtDateTime, getIn, pendencias, setIn } from './lib/draft.js';
import { respond } from './lib/chatEngine.js';

const WELCOME = {
  role: 'ai',
  text: 'Rascunho pronto. Filtrei as amenidades, traduzi a linguagem popular e sugeri 3 CIDs. Encontrei **1 alerta de segurança** na prescrição. Peça os ajustes por aqui — nada vira registro final sem a sua homologação.',
};

// Mensagem inicial da assistente para um rascunho gerado pela IA.
function welcomeFor(draft, stats) {
  const n = draft.a.cids.length;
  const alerts = findAllergyConflicts(draft).length;
  return {
    role: 'ai',
    text:
      `Rascunho pronto. Filtrei ${stats.filtrados} trecho${stats.filtrados === 1 ? '' : 's'} não clínico${stats.filtrados === 1 ? '' : 's'}, ` +
      `traduzi ${stats.termos} ${stats.termos === 1 ? 'expressão popular' : 'expressões populares'} e sugeri ${n} CID${n === 1 ? '' : 's'}. ` +
      (alerts ? `Encontrei **${alerts} alerta${alerts > 1 ? 's' : ''} de segurança** na prescrição. ` : 'Não encontrei alertas de segurança na prescrição. ') +
      'Peça os ajustes por aqui — nada vira registro final sem a sua homologação.',
  };
}

export default function App() {
  const [patientId, setPatientId] = useState(PACIENTES[0].id);
  const [view, setView] = useState('atendimento'); // atendimento | historico | prontuarios
  const patient = PACIENTES.find((p) => p.id === patientId);
  const [evidence, setEvidence] = useState(EVIDENCE);
  const [gen, setGen] = useState({ ready: true, error: null, stats: PROCESSING_STATS });
  const genRef = useRef(null);
  const sessionRef = useRef(0); // invalida respostas assíncronas após reiniciar ou trocar de paciente
  const [phase, setPhase] = useState('idle'); // idle | recording | recorded | generating | review | final
  const [transcriptionStatus, setTranscriptionStatus] = useState(null); // Gravando | Processando | Concluida | Erro
  const [startedAt, setStartedAt] = useState(null);
  const [mode, setMode] = useState('sim'); // real (microfone + backend) | sim (consulta mockada)
  const [segments, setSegments] = useState(SEGMENTS);
  const [audio, setAudio] = useState(null); // { blob, filename, url }
  const [audioPos, setAudioPos] = useState(0);
  const [transcriptError, setTranscriptError] = useState(null);
  const audioRef = useRef(null);
  const mic = useMicRecorder();

  const [draft, setDraft] = useState(null);
  const [flash, setFlash] = useState([]);
  const [ackedKey, setAckedKey] = useState(null);
  const [reviewed, setReviewed] = useState(false);

  const [assistTab, setAssistTab] = useState('chat');
  const [assistOpen, setAssistOpen] = useState(false);
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
    if (phase === 'recording' && mode === 'sim') finishRecording();
  });

  const notify = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2400);
  };

  /* ---------- fluxo de gravação (FL-01 / FL-02) ---------- */
  const runTranscription = async ({ blob, filename }) => {
    setPhase('recorded');
    setTranscriptionStatus('Processando');
    setTranscriptError(null);
    const sid = sessionRef.current;
    try {
      const data = await transcribeAudio(blob, filename);
      if (sid !== sessionRef.current) return;
      const segs = toSegments(data.segments || []);
      if (!segs.length) throw new Error('Nenhuma fala foi identificada no áudio. Grave novamente mais perto do microfone.');
      setSegments(segs);
      setTranscriptionStatus('Concluida');
    } catch (err) {
      if (sid !== sessionRef.current) return;
      setTranscriptError(err.message);
      setTranscriptionStatus('Erro');
    }
  };
  const setAudioFile = (blob, filename) => {
    if (audio?.url) URL.revokeObjectURL(audio.url);
    const next = { blob, filename, url: URL.createObjectURL(blob) };
    setAudio(next);
    setAudioPos(0);
    return next;
  };

  const start = async () => {
    setStartedAt(new Date());
    setSegments(mode === 'sim' ? SEGMENTS : []);
    if (mode === 'real') {
      try {
        await mic.start();
      } catch {
        notify('Não foi possível acessar o microfone. Verifique a permissão do navegador.');
        return;
      }
      setPhase('recording');
      setTranscriptionStatus('Gravando');
      return;
    }
    setPhase('recording');
    setTranscriptionStatus('Gravando');
    pb.reset();
    setTimeout(pb.play, 50);
  };
  const stop = async () => {
    if (mode === 'real') {
      const blob = await mic.stop();
      if (!blob || !blob.size) {
        notify('A gravação ficou vazia. Tente novamente.');
        setPhase('idle');
        setTranscriptionStatus(null);
        return;
      }
      const ext = blob.type.startsWith('audio/ogg') ? 'ogg' : blob.type.startsWith('audio/mp4') ? 'm4a' : 'webm';
      runTranscription(setAudioFile(blob, `consulta.${ext}`));
      return;
    }
    pb.pause();
    pb.seek(DURATION);
    finishRecording();
  };
  const upload = (file) => {
    if (file.size > 25 * 1024 * 1024) {
      notify('O arquivo excede o limite de 25 MB.');
      return;
    }
    setStartedAt(new Date());
    setSegments([]);
    runTranscription(setAudioFile(file, file.name));
  };
  const retry = () => audio && runTranscription(audio);
  const resetRecording = () => {
    sessionRef.current += 1;
    mic.cancel();
    pb.reset();
    setPhase('idle');
    setTranscriptionStatus(null);
    setTranscriptError(null);
    setSegments(mode === 'sim' ? SEGMENTS : []);
  };
  const skip = () => {
    pb.seek(DURATION - 0.3);
  };
  // Paciente demo: rascunho mockado. Demais pacientes: rascunho SOAP elaborado pela IA no backend.
  const runGeneration = async () => {
    genRef.current = null;
    setGen({ ready: false, error: null, stats: null });
    const sid = sessionRef.current;
    try {
      const data = await generateDraft({
        patient: { nome: patient.nome, idade: `${patient.idade} anos`, sexo: patient.sexo },
        data_hora: fmtDateTime(startedAt || new Date()),
        transcript: segments.map((s) => ({ id: s.id, role: s.speaker === 'M' ? 'medico' : 'paciente', text: s.text })),
      });
      if (sid !== sessionRef.current) return;
      genRef.current = { ...data, meta: new Map(data.segments.map((m) => [m.id, m])) };
      setGen({ ready: true, error: null, stats: data.stats });
    } catch (err) {
      if (sid !== sessionRef.current) return;
      setGen({ ready: false, error: err.message, stats: null });
    }
  };
  const generate = () => {
    pb.pause();
    audioRef.current?.pause();
    setPhase('generating');
    if (patient.demo) {
      genRef.current = null;
      setGen({ ready: true, error: null, stats: PROCESSING_STATS });
    } else {
      runGeneration();
    }
  };
  const onGenerated = useCallback(() => {
    const g = genRef.current;
    if (g) {
      setDraft(g.draft);
      setEvidence(g.evidence);
      setSegments((segs) => segs.map((s) => {
        const m = g.meta.get(s.id);
        return m ? { ...s, clinical: m.clinical, terms: m.terms } : s;
      }));
      setMessages([welcomeFor(g.draft, g.stats)]);
    } else {
      setDraft(buildInitialDraft(fmtDateTime(startedAt || new Date())));
      setEvidence(EVIDENCE);
      setMessages([WELCOME]);
    }
    setAssistTab('chat');
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

  const acceptAllCids = () =>
    setDraft((d) =>
      touch({ ...d, a: { ...d.a, cids: d.a.cids.map((c) => (c.status === 'Sugerida' ? { ...c, status: 'Aceita' } : c)) } }),
    );

  const conflicts = useMemo(() => (draft ? findAllergyConflicts(draft) : []), [draft]);
  const conflictKey = conflicts.map((c) => `${c.rxId}:${c.med}`).join('|');
  const alertAcked = conflicts.length > 0 && ackedKey === conflictKey;
  const alertOk = conflicts.length === 0 || alertAcked;

  const showEvidence = (ids) => {
    setHighlight(ids);
    setAssistTab('transcript');
    setAssistOpen(true);
  };

  // Aplica só as seções que o assistente mudou, sobre o estado atual (o médico pode ter editado durante a espera).
  const applyResult = (serverDraft, paths, reply, log, prefix = '') => {
    if (paths.length) {
      setDraft((d) => {
        let next = d;
        for (const p of paths) next = setIn(next, p, getIn(serverDraft, p));
        return touch(next);
      });
      flashPaths(paths);
    }
    setMessages((m) => [
      ...m,
      { role: 'ai', text: `${prefix}${reply}` },
      ...(log ? [{ role: 'system', text: `Alteração aplicada — ${log}` }] : []),
    ]);
  };

  const busyRef = useRef(false);
  const send = async (text) => {
    if (busyRef.current) return;
    busyRef.current = true;
    // Consulta simulada: regras locais, sem chamadas à IA (sem custo de tokens).
    if (patient.demo) {
      setMessages((m) => [...m, { role: 'user', text }]);
      setTyping(true);
      setTimeout(() => {
        const res = respond(text, draftRef.current);
        applyResult(res.draft, res.changed, res.reply, res.log, '*Simulação — regras locais, sem IA:* ');
        setTyping(false);
        busyRef.current = false;
      }, 500);
      return;
    }
    const history = messages
      .filter((m) => m.role !== 'system')
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }));
    setMessages((m) => [...m, { role: 'user', text }]);
    setTyping(true);
    try {
      const data = await askAssistant({
        draft: draftRef.current,
        message: text,
        history,
        transcript: segments.map((s) => ({ role: s.speaker === 'M' ? 'medico' : 'paciente', text: s.text })),
      });
      applyResult(data.draft, data.changed_paths, data.reply, data.log);
    } catch (err) {
      // Plano B: regras locais, sinalizadas como tal para o médico.
      const res = respond(text, draftRef.current);
      applyResult(res.draft, res.changed, res.reply, res.log, `*${err.message} Modo offline (regras locais):* `);
    } finally {
      setTyping(false);
      busyRef.current = false;
    }
  };

  /* ---------- homologação (FL-04) ---------- */
  const pend = draft ? pendencias(draft, { alertOk, reviewed }) : [];
  const saveDraft = () => {
    try {
      localStorage.setItem('prontuai:rascunho', JSON.stringify(draft));
    } catch (e) {
      /* armazenamento indisponível: mantém em memória */
    }
    notify('Rascunho salvo — o prontuário ainda não foi elaborado');
  };
  const elaborar = () => {
    window.speechSynthesis?.cancel();
    setDraft((d) => ({ ...d, status: 'Homologado', homologadoEm: fmtDateTime(new Date()), assinatura: Math.random().toString(16).slice(2, 10).toUpperCase() }));
    setPhase('final');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const restart = () => {
    sessionRef.current += 1;
    genRef.current = null;
    setEvidence(EVIDENCE);
    setAssistOpen(false);
    window.speechSynthesis?.cancel();
    pb.reset();
    mic.cancel();
    setDraft(null);
    setPhase('idle');
    setSegments(mode === 'sim' ? SEGMENTS : []);
    setTranscriptError(null);
    setTranscriptionStatus(null);
    setReviewed(false);
    setAckedKey(null);
    setHighlight([]);
    setMessages([WELCOME]);
  };

  const switchPatient = (id) => {
    restart();
    if (audio?.url) URL.revokeObjectURL(audio.url);
    setAudio(null);
    setStartedAt(null);
    setMode('real');
    setSegments([]);
    setPatientId(id);
    setView('atendimento');
  };

  /* ---------- derivados de UI ---------- */
  const consulta = locked ? 'Finalizada' : phase === 'review' ? 'AguardandoRevisao' : 'EmAndamento';
  const stepIdx = locked ? 4 : phase === 'review' ? 3 : phase === 'generating' ? 2 : phase === 'recorded' ? 1 : 0;
  const inReview = phase === 'review' && draft;

  return (
    <>
      <TopNav />
      <main className="page">
        <div className="no-print">
          <PatientHeader
            consulta={consulta}
            dataHora={startedAt ? fmtDateTime(startedAt) : null}
            patient={patient}
            patients={PACIENTES}
            onSelect={switchPatient}
            actions={
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('historico')}>
                  Histórico de consultas
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setView('prontuarios')}>
                  Prontuários anteriores
                </button>
              </>
            }
          />
        </div>
        {view !== 'atendimento' && (
          <HistoryView
            mode={view}
            consultas={HISTORICO[patient.id] || []}
            patient={patient}
            onBack={() => setView('atendimento')}
          />
        )}
        {view === 'atendimento' && (<>
        {phase === 'final' ? (
          <div className="done-icon" role="img" aria-label="Consulta concluída">
            <IconCheck width={28} height={28} strokeWidth={3} />
          </div>
        ) : (
          <div className="no-print"><Stepper current={stepIdx} /></div>
        )}

        {!inReview && phase !== 'generating' && phase !== 'final' && (
          <div className="grid-main">
            <Recorder
              allowSim={patient.demo}
              mode={mode}
              setMode={(m) => {
                setMode(m);
                setSegments(m === 'sim' ? SEGMENTS : []);
              }}
              phase={phase}
              pb={pb}
              mic={mic}
              audioUrl={audio?.url}
              audioRef={audioRef}
              onAudioTime={setAudioPos}
              onUpload={upload}
              onRetry={retry}
              onReset={resetRecording}
              error={transcriptError}
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
                {transcriptionStatus && transcriptionStatus !== 'Gravando' && (
                  <span className={`badge ${transcriptionStatus === 'Concluida' ? 'badge-success' : 'badge-attention'}`}>
                    {transcriptionStatus === 'Concluida' ? 'Concluída' : transcriptionStatus}
                  </span>
                )}
              </div>
              {mode === 'real' ? (
                <TranscriptView
                  mode="full"
                  segments={transcriptionStatus === 'Concluida' ? segments : []}
                  pos={audioPos}
                  onSeek={
                    transcriptionStatus === 'Concluida'
                      ? (t) => {
                          if (audioRef.current) {
                            audioRef.current.currentTime = t;
                            audioRef.current.play();
                          }
                        }
                      : undefined
                  }
                  empty={
                    phase === 'recording'
                      ? { title: 'Gravando a consulta…', text: 'Converse normalmente. A transcrição com identificação de médico e paciente é gerada quando você parar a gravação.' }
                      : transcriptionStatus === 'Processando'
                        ? { title: 'Transcrevendo…', text: 'O áudio foi enviado ao backend. Separando locutores e classificando médico e paciente.' }
                        : transcriptionStatus === 'Erro'
                          ? { title: 'Não foi possível transcrever', text: transcriptError }
                          : undefined
                  }
                />
              ) : (
                <TranscriptView
                  mode={phase === 'recording' ? 'live' : phase === 'idle' ? 'live' : 'full'}
                  pos={phase === 'recording' || phase === 'idle' || pb.pos < DURATION ? pb.pos : 0}
                  onSeek={phase === 'recorded' ? pb.seek : undefined}
                />
              )}
            </section>
          </div>
        )}

        {phase === 'generating' && (
          <GeneratingView
            onDone={onGenerated}
            ready={gen.ready}
            error={gen.error}
            stats={gen.stats}
            onRetry={runGeneration}
            onCancel={() => setPhase('recorded')}
          />
        )}

        {phase === 'final' && draft && (
          <FinalView draft={draft} patient={patient} conflicts={conflicts} alertAcked={alertAcked} startedAt={startedAt} onRestart={restart} />
        )}

        {inReview && (
          <>
            <ReviewFlow
              draft={draft}
              evidence={evidence}
              locked={locked}
              flash={flash}
              conflicts={conflicts}
              alertAcked={alertAcked}
              onAck={() => {
                setAckedKey(conflictKey);
                setDraft(touch);
              }}
              onFixAlert={(drug) => {
                setAssistTab('chat');
                setAssistOpen(true);
                setPrefill(`Substitua a ${drug} por paracetamol 750 mg`);
              }}
              onChange={onChange}
              onCid={onCid}
              onAcceptAll={acceptAllCids}
              onEvidence={!patient.demo || mode === 'sim' ? showEvidence : undefined}
              reviewed={reviewed}
              setReviewed={setReviewed}
              pend={pend}
            />

            <FloatingAssistant
              open={assistOpen}
              setOpen={setAssistOpen}
              tab={assistTab}
              setTab={setAssistTab}
              messages={messages}
              typing={typing}
              locked={locked}
              onSend={send}
              prefill={prefill}
              onPrefillUsed={() => setPrefill('')}
              segments={segments}
              highlight={highlight}
            />

            {!locked && (
              <section className="finish-zone" aria-label="Finalizar revisão">
                <div className="finish-text">
                  <strong>Finalizar revisão</strong>
                  <p className="pend small">
                    {pend.length ? `Pendências: ${pend.join(' · ')}` : <><IconCheck width={14} height={14} /> Pronto para elaborar o prontuário</>}
                  </p>
                </div>
                <div className="actionbar-right">
                  <button type="button" className="btn btn-ghost" onClick={saveDraft}>
                    Salvar rascunho
                  </button>
                  <button type="button" className="btn btn-cobalt" disabled={pend.length > 0} onClick={elaborar}>
                    Elaborar prontuário
                  </button>
                </div>
              </section>
            )}
          </>
        )}
        </>)}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
