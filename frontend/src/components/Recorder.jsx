import React, { useMemo, useRef } from 'react';
import { IconMic, IconPause, IconPlay, IconPlus, IconSparkle, IconStop } from './Icons.jsx';
import { DURATION } from '../data/mock.js';
import { fmtTime } from '../lib/draft.js';

const BARS = 72;

function Waveform({ pos, live, showProgress, onSeek, levels }) {
  const heights = useMemo(
    () => Array.from({ length: BARS }, (_, i) => 18 + Math.abs(Math.sin(i * 0.9) * 40 + Math.sin(i * 0.31) * 30 + Math.cos(i * 2.1) * 12)),
    [],
  );
  const progress = pos / DURATION;
  return (
    <div
      className={`wave ${live && !levels ? 'live' : ''} ${levels ? 'mic' : ''} ${onSeek ? 'seekable' : ''}`}
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
          style={{ height: levels ? `${6 + levels[i] * 94}%` : `${h}%`, '--d': `${(i % 12) * 70}ms` }}
        />
      ))}
    </div>
  );
}

export default function Recorder({
  mode,
  setMode,
  phase,
  pb,
  mic,
  audioUrl,
  audioRef,
  onAudioTime,
  onStart,
  onStop,
  onGenerate,
  onSkip,
  onUpload,
  onRetry,
  onReset,
  transcriptionStatus,
  error,
}) {
  const fileRef = useRef(null);
  const real = mode === 'real';
  const recording = phase === 'recording';
  const recorded = phase === 'recorded';
  const processing = transcriptionStatus === 'Processando';
  const failed = transcriptionStatus === 'Erro';

  return (
    <section className="card recorder">
      <div className="card-head">
        <div>
          <h2 className="h-sm">Gravação da consulta</h2>
          <p className="muted small">
            {real ? 'Microfone do navegador · transcrição com IA no backend.' : 'Consulta simulada para demonstração.'}
          </p>
        </div>
      </div>

      {phase === 'idle' && (
        <div className="mode-switch" role="group" aria-label="Origem do áudio">
          <button type="button" className={`pill-tab sm ${real ? 'active' : ''}`} onClick={() => setMode('real')}>
            Microfone real
          </button>
          <button type="button" className={`pill-tab sm ${!real ? 'active' : ''}`} onClick={() => setMode('sim')}>
            Consulta simulada
          </button>
        </div>
      )}

      <div className="timer" aria-live="off">
        {fmtTime(real ? mic.elapsed : pb.pos)}
        {!real && <small> / {fmtTime(DURATION)}</small>}
      </div>

      {real && recorded && audioUrl ? (
        <audio
          ref={audioRef}
          className="player"
          src={audioUrl}
          controls
          onTimeUpdate={(e) => onAudioTime(e.currentTarget.currentTime)}
        />
      ) : (
        <Waveform
          pos={pb.pos}
          live={pb.playing}
          levels={real ? mic.levels : null}
          showProgress={!real && phase !== 'idle' && phase !== 'recording'}
          onSeek={!real && recorded && !processing ? pb.seek : undefined}
        />
      )}

      {failed && error && <p className="error small" role="alert">{error}</p>}

      <div className="controls">
        {phase === 'idle' && (
          <>
            <button className="btn btn-rec btn-lg" type="button" onClick={onStart}>
              <IconMic /> Iniciar gravação
            </button>
            {real && (
              <>
                <button className="btn btn-ghost" type="button" onClick={() => fileRef.current?.click()}>
                  <IconPlus width={16} height={16} /> Enviar arquivo de áudio
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,.webm,.ogg,.mp3,.m4a,.wav,.flac,.mp4"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(f);
                    e.target.value = '';
                  }}
                />
              </>
            )}
          </>
        )}

        {recording && (
          <>
            <button className="btn btn-danger btn-lg" type="button" onClick={onStop}>
              <IconStop /> Parar gravação
            </button>
            {!real && (
              <button className="btn btn-ghost" type="button" onClick={onSkip} title="Atalho de demonstração">
                Avançar para o fim
              </button>
            )}
          </>
        )}

        {recorded && processing && (
          <p className="muted small processing"><i className="spin" /> Enviando o áudio, transcrevendo e identificando médico e paciente…</p>
        )}

        {recorded && failed && (
          <>
            <button className="btn btn-primary" type="button" onClick={onRetry}>Tentar novamente</button>
            <button className="btn btn-ghost" type="button" onClick={onReset}>Gravar de novo</button>
          </>
        )}

        {recorded && transcriptionStatus === 'Concluida' && (
          <>
            <button className="btn btn-cobalt btn-lg" type="button" onClick={onGenerate}>
              <IconSparkle /> Gerar prontuário com IA
            </button>
            {real ? (
              <button className="btn btn-ghost" type="button" onClick={onReset}>Gravar de novo</button>
            ) : (
              <button className="btn btn-secondary" type="button" onClick={pb.playing ? pb.pause : pb.play}>
                {pb.playing ? <IconPause /> : <IconPlay />} {pb.playing ? 'Pausar' : 'Ouvir gravação'}
              </button>
            )}
          </>
        )}
      </div>

      {!real && (
        <div className="demo-opts">
          <div className="speed" role="group" aria-label="Velocidade da simulação">
            {[1, 2, 4].map((s) => (
              <button key={s} type="button" className={`pill-tab sm ${pb.speed === s ? 'active' : ''}`} onClick={() => pb.setSpeed(s)}>
                {s}x
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
