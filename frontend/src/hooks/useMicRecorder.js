import { useCallback, useEffect, useRef, useState } from 'react';

const BARS = 72;

// Gravação real pelo microfone (MediaRecorder) com nível de áudio para a forma de onda.
export function useMicRecorder() {
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState(() => Array(BARS).fill(0));
  const ref = useRef({});

  const cleanup = useCallback(() => {
    const r = ref.current;
    clearInterval(r.timer);
    cancelAnimationFrame(r.raf);
    r.stream?.getTracks().forEach((t) => t.stop());
    r.ctx?.close().catch(() => {});
    ref.current = {};
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const start = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks = [];
    recorder.addEventListener('dataavailable', (e) => e.data.size && chunks.push(e.data));
    recorder.start(1000);

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    ctx.createMediaStreamSource(stream).connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let last = 0;
    const tick = (now) => {
      if (now - last > 70) {
        last = now;
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) sum += ((buf[i] - 128) / 128) ** 2;
        const rms = Math.min(1, Math.sqrt(sum / buf.length) * 4);
        setLevels((l) => [...l.slice(1), rms]);
      }
      ref.current.raf = requestAnimationFrame(tick);
    };

    const t0 = performance.now();
    setElapsed(0);
    setLevels(Array(BARS).fill(0));
    ref.current = {
      stream,
      recorder,
      chunks,
      ctx,
      raf: requestAnimationFrame(tick),
      timer: setInterval(() => setElapsed((performance.now() - t0) / 1000), 200),
    };
  }, []);

  const stop = useCallback(
    () =>
      new Promise((resolve) => {
        const { recorder, chunks } = ref.current;
        if (!recorder || recorder.state === 'inactive') {
          cleanup();
          resolve(null);
          return;
        }
        recorder.addEventListener('stop', () => {
          const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
          cleanup();
          resolve(blob);
        });
        recorder.stop();
      }),
    [cleanup],
  );

  return { elapsed, levels, start, stop, cancel: cleanup };
}
