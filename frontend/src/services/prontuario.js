// Cliente da geração do rascunho SOAP por IA (backend/app/prontuario.py).

export async function generateDraft(payload) {
  let response;
  try {
    response = await fetch('/api/prontuario/gerar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error('Não foi possível conectar ao backend. Verifique se ele está rodando na porta 8000.');
  }
  const data = await response.json().catch(() => null);
  if (!data) throw new Error('O servidor não respondeu como a API de prontuário. Verifique se o backend de IA está ativo.');
  if (!response.ok) {
    const detail = Array.isArray(data.detail) ? 'A transcrição enviada é inválida.' : data.detail;
    throw new Error(detail || `Falha ao elaborar o rascunho (HTTP ${response.status}).`);
  }
  return data;
}
