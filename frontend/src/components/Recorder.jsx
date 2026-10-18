import React, { useMemo } from 'react';
import { IconMic, IconPause, IconPlay, IconSparkle, IconStop } from './Icons.jsx';
import { DURATION } from '../data/mock.js';
import { fmtTime } from '../lib/draft.js';

const BARS = 72;

function Waveform({ pos, live, showProgress, onSeek }) {
  const heights = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 18 + Math.abs(Math.sin(i * 0.9) * 40 + Math.sin(i * 0.31) * 30 + Math.cos(i * 2.1) * 12)),
    [],
  );
  const progress = pos / DURATION;
  return (
    <div
      className={`wave ${live ? 'live' : ''} ${onSeek ? 'seekable' : ''}`}
      onClick={(e) => {
        if (!onSeek) return;
        const r = e.currentTarget.getBoundingClientRect();
        onSeek(((e.clientX - r.left) / r.width) * DURATION);
      }}
      role={onSeek ? 'slider' : undefined}
      aria-label="Linha do tempo do áudio"
    >
      {heights.map((h, i) => (
        <span
          key={i}
          className={showProgress && i / BARS <= progress ? 'on' : ''}
          style={{ height: `${h}%`, '--d': `${(i % 12) * 70}ms` }}
        />
      ))}
    </div>
  );
}

export default function Recorder({
  phase,
  pb,
  voiceOn,
  setVoiceOn,
  onStart,
  onStop,
  onGenerate,
  onSkip,
  transcriptionStatus,
}) {
  const recording = phase === 'recording';
  const recorded = phase === 'recorded';
  const processing = transcriptionStatus === 'Processando';

  return (
    <section className="card recorder">
      <div className="card-head">
        <div>
          <h2 className="h-sm">Gravação da consulta</h2>
          <p className="muted small">O áudio bruto é descartado após a homologação.</p>
        </div>
        {recording && (
          <span className="badge badge-critical rec-badge">
            <i className="dot" /> Gravando
          </span>
        )}
        {processing && <span className="badge badge-attention">Processando transcrição…</span>}
        {recorded && !processing && <span className="badge badge-success">Gravação concluída</span>}
      </div>

      <div className="timer" aria-live="off">
        {fmtTime(pb.pos)}
        <small> / {fmtTime(DURATION)}</small>
      </div>

      <Waveform
        pos={pb.pos}
        live={pb.playing}
        showProgress={phase !== 'idle' && phase !== 'recording'}
        onSeek={recorded && !processing ? pb.seek : undefined}
      />

      <div className="controls">
        {phase === 'idle' && (
          <button className="btn btn-primary btn-lg" type="button" onClick={onStart}>
            <IconMic /> Iniciar gravação
          </button>
        )}

        {recording && (
          <>
            <button className="btn btn-danger btn-lg" type="button" onClick={onStop}>
              <IconStop /> Parar gravação
            </button>
            <button className="btn btn-ghost" type="button" onClick={onSkip} title="Atalho de demonstração">
              Avançar para o fim
            </button>
          </>
        )}

        {recorded && !processing && (
          <>
            <button className="btn btn-cobalt btn-lg" type="button" onClick={onGenerate}>
              <IconSparkle /> Gerar prontuário com IA
            </button>
            <button className="btn btn-secondary" type="button" onClick={pb.playing ? pb.pause : pb.play}>
              {pb.playing ? <IconPause /> : <IconPlay />} {pb.playing ? 'Pausar' : 'Ouvir gravação'}
            </button>
          </>
        )}
      </div>

      <div className="demo-opts">
        <div className="speed" role="group" aria-label="Velocidade da simulação">
          {[1, 2, 4].map((s) => (
            <button key={s} type="button" className={`pill-tab sm ${pb.speed === s ? 'active' : ''}`} onClick={() => pb.setSpeed(s)}>
              {s}x
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={voiceOn} onChange={(e) => setVoiceOn(e.target.checked)} />
          <span className="track" />
          <span className="small">Narrar áudio (voz sintética)</span>
        </label>
      </div>
    </section>
  );
}
