// Servidor estático para a hospedagem temporária (scripts/hospedagem.ps1).
// O projeto ainda não tem backend: serve o frontend compilado (frontend/dist).
// Sem dependências externas. Variáveis: PORT e BASIC_AUTH_PASSWORD (opcional).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'frontend', 'dist');
const porta = process.env.PORT || 3010;

const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// Proteção básica opcional (ativa só se BASIC_AUTH_PASSWORD estiver definido)
function autorizado(req) {
  const senha = process.env.BASIC_AUTH_PASSWORD;
  if (!senha) return true;
  const credencial = (req.headers.authorization || '').split(' ')[1] || '';
  const [, informada = ''] = Buffer.from(credencial, 'base64').toString().split(':');
  return informada === senha;
}

const servidor = http.createServer((req, res) => {
  if (!autorizado(req)) {
    res.writeHead(401, { 'WWW-Authenticate': 'Basic realm="ProntuAI"' });
    return res.end('Autenticação necessária');
  }

  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (caminho === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end('{"status":"ok"}');
  }

  let arquivo = path.join(raiz, caminho);
  if (!arquivo.startsWith(raiz)) {
    res.writeHead(403);
    return res.end();
  }
  if (!fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) {
    arquivo = path.join(raiz, 'index.html'); // fallback de SPA
  }
  res.writeHead(200, { 'Content-Type': tipos[path.extname(arquivo)] || 'application/octet-stream' });
  fs.createReadStream(arquivo).pipe(res);
});

servidor.listen(porta, () => console.log(`ProntuAI em http://localhost:${porta}`));
