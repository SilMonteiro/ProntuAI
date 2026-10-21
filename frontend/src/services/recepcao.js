// Cliente da API da recepção (backend/app/recepcao.py).

async function call(path, options) {
  let response;
  try {
    response = await fetch(`/api/recepcao${path}`, options);
  } catch {
    throw new Error('Não foi possível conectar ao backend. Verifique se ele está rodando na porta 8000.');
  }
  if (response.status === 204) return null;
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.detail;
    // Erros de validação do FastAPI vêm como lista; usa a primeira mensagem.
    const msg = Array.isArray(detail) ? detail[0]?.msg?.replace(/^Value error, /, '') : detail;
    throw new Error(msg || `Falha na requisição (HTTP ${response.status}).`);
  }
  return data;
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const buscarPacientes = (q) => call(`/pacientes?q=${encodeURIComponent(q)}`);
export const cadastrarPaciente = (paciente) => call('/pacientes', json('POST', paciente));
export const listarFila = () => call('/fila');
export const entrarNaFila = (pacienteId, prioridade) => call('/fila', json('POST', { paciente_id: pacienteId, prioridade }));
export const sairDaFila = (itemId) => call(`/fila/${itemId}`, { method: 'DELETE' });
