// Cliente do assistente de IA (backend/app/assistant.py).

export async function askAssistant(payload) {
  let response;
  try {
    response = await fetch('/api/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Não foi possível conectar ao assistente.');
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new Error('O assistente não respondeu pela API.');
  if (!response.ok) throw new Error(data.detail || `Assistente indisponível (HTTP ${response.status}).`);
  return data;
}
