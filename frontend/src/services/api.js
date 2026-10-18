// Cliente do backend de transcrição (backend/app/main.py).

export async function transcribeAudio(blob, filename) {
  const form = new FormData();
  form.append('audio', blob, filename);

  let response;
  try {
    response = await fetch('/api/transcriptions', { method: 'POST', body: form });
  } catch {
    throw new Error('Não foi possível conectar ao backend. Verifique se ele está rodando na porta 8000.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Falha na transcrição (HTTP ${response.status}).`);
  return data;
}

// Converte os segmentos da API para o formato usado pela TranscriptView.
// Falas consecutivas do mesmo locutor (separadas por pausas curtas) viram um único turno.
export function toSegments(apiSegments) {
  const merged = [];
  apiSegments
    .filter((s) => s.text)
    .forEach((s) => {
      const prev = merged[merged.length - 1];
      if (prev && prev.role === s.role && s.start_ms - prev.end_ms < 1500) {
        prev.text = `${prev.text} ${s.text}`;
        prev.end_ms = s.end_ms;
      } else {
        merged.push({ ...s });
      }
    });
  return merged.map((s, i) => ({
      id: i + 1,
      speaker: s.role === 'medico' ? 'M' : 'P',
      text: s.text,
      start: s.start_ms / 1000,
      dur: Math.max(0.5, (s.end_ms - s.start_ms) / 1000),
      clinical: true,
      terms: [],
    }));
}
