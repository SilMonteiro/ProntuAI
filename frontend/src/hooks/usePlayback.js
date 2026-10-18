import { useCallback, useEffect, useRef, useState } from 'react';

// Relógio de reprodução simulada do áudio da consulta.
export function usePlayback(duration, onEnd) {
  const [pos, setPos] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(2);
  const endRef = useRef(onEnd);
  endRef.current = onEnd;

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => setPos((p) => Math.min(duration, p + 0.1 * speed)), 100);
    return () => clearInterval(id);
  }, [playing, speed, duration]);

  useEffect(() => {
    if (playing && pos >= duration) {
      setPlaying(false);
      endRef.current?.();
    }
  }, [pos, playing, duration]);

  const play = useCallback(() => {
    setPos((p) => (p >= duration ? 0 : p));
    setPlaying(true);
  }, [duration]);
  const pause = useCallback(() => setPlaying(false), []);
  const seek = useCallback((s) => setPos(Math.max(0, Math.min(duration, s))), [duration]);
  const reset = useCallback(() => {
    setPlaying(false);
    setPos(0);
  }, []);

  return { pos, playing, speed, setSpeed, play, pause, seek, reset };
}
