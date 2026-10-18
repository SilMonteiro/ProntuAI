# Publicação temporária para apresentação

Este documento descreve como gerar um link HTTPS temporário para abrir o sistema em qualquer computador durante uma apresentação, e como repetir o mesmo processo em outro repositório.

## Solução adotada

**Cloudflare Quick Tunnel**: cria um endereço aleatório em `trycloudflare.com` que encaminha as requisições para o servidor que continua rodando nesta máquina.

- não exige domínio próprio nem abrir portas no roteador;
- fornece HTTPS, necessário para o navegador permitir o microfone;
- o endereço muda a cada vez que o túnel é aberto;
- o endereço deixa de funcionar quando a hospedagem é encerrada ou a máquina é desligada;
- **não tem nenhuma proteção própria**: qualquer pessoa com o endereço acessa o sistema.

Quick Tunnels servem para testes e demonstrações, não para produção.

## Como funciona neste repositório

Um único processo atende tudo: o backend Express (`backend/src/server.js`) serve a API (`/api`), os áudios (`/uploads`) e o frontend já compilado (`frontend/dist`). O túnel expõe essa porta (padrão **3010**, para não colidir com a 3001 do desenvolvimento).

O script `scripts/hospedagem.ps1` automatiza o processo:

| Ação | O que faz |
| --- | --- |
| `ligar` | compila o frontend (se necessário), baixa o `cloudflared`, sobe o backend, abre o túnel e mostra o endereço |
| `link` | mostra o endereço atual (e a senha, se houver) |
| `desligar` | encerra backend e túnel |

## Uso

No PowerShell, na raiz do projeto:

```powershell
.\scripts\hospedagem.ps1 ligar            # publica; o link abre direto, sem senha
.\scripts\hospedagem.ps1 ligar -Rebuild   # recompila o frontend antes (use após mudar o código)
.\scripts\hospedagem.ps1 link             # mostra o endereço atual
.\scripts\hospedagem.ps1 desligar         # encerra a hospedagem
```

Parâmetros opcionais:

- `-Senha minha`: protege o acesso com senha básica (o navegador pede usuário e senha; o usuário pode ser qualquer um). Sem esse parâmetro, o acesso é livre.
- `-Porta 3020`: usa outra porta. Cada porta tem seu próprio estado, então é possível manter mais de uma hospedagem.

Se o PowerShell bloquear o script, rode antes `Set-ExecutionPolicy -Scope Process Bypass` (vale só para a janela atual).

Na primeira execução, o script baixa o `cloudflared` oficial para `tools/cloudflared.exe`. Ao final, aparece algo como:

```text
Endereço: https://palavras-aleatorias.trycloudflare.com
Acesso:   livre, sem senha
```

Logo após criar o túnel, o DNS pode levar alguns segundos para propagar. Abra o link uma vez antes de apresentar.

## Pré-requisitos

- Windows com PowerShell 5.1 ou superior;
- Node.js e as dependências do projeto instaladas (`npm install` na raiz, em `backend/` e em `frontend/`);
- conexão com a internet;
- `backend/.env` configurado (por exemplo `AI_MODE` e `OPENAI_API_KEY`, se for usar a IA real).

## Replicar em outro repositório

O processo serve para qualquer projeto em que **um único servidor possa atender frontend e API na mesma porta**. Passo a passo:

### 1. Copiar os arquivos

Copie `scripts/hospedagem.ps1` para a pasta `scripts/` do outro repositório e acrescente ao `.gitignore`:

```gitignore
# Hospedagem temporária (scripts/hospedagem.ps1)
tools/
logs/
```

### 2. Ajustar o servidor (Express)

No arquivo principal do servidor, antes das rotas e depois dos middlewares globais, adicione a senha opcional e o frontend compilado:

```js
// Proteção básica opcional (ativa só se BASIC_AUTH_PASSWORD estiver definido)
app.use((req, res, next) => {
  const senha = process.env.BASIC_AUTH_PASSWORD;
  if (!senha) return next();

  const credencial = (req.headers.authorization || '').split(' ')[1] || '';
  const [, senhaInformada = ''] = Buffer.from(credencial, 'base64').toString().split(':');
  if (senhaInformada === senha) return next();

  res.set('WWW-Authenticate', 'Basic realm="App"');
  res.status(401).send('Autenticação necessária');
});

// Servir o frontend compilado (ajuste o caminho para a pasta de build)
app.use(express.static(path.join(__dirname, '..', '..', 'frontend', 'dist')));
```

O servidor também deve ler a porta de `process.env.PORT`, como em `const PORT = process.env.PORT || 3001;`. O script define essa variável.

### 3. Conferir as premissas do script

Abra `scripts/hospedagem.ps1` e verifique estes pontos, ajustando o que for diferente no outro projeto:

- **Frontend**: o script roda `npm --prefix frontend run build` e espera `frontend/dist/index.html`. Mude o caminho se o projeto usar outra pasta ou outro comando de build.
- **Backend**: o script inicia `node backend/src/server.js`. Mude o arquivo de entrada se necessário.
- **Endpoint de saúde**: o script espera `GET /api/health` respondendo 200 para saber que o servidor subiu. Crie esse endpoint ou altere a função `Testar-Backend`.
- **Chamadas do frontend à API**: devem usar caminho relativo (como `/api`), e não `http://localhost:...`. Em desenvolvimento, esse caminho costuma ser resolvido por um proxy do Vite, que não existe na versão compilada; por isso o backend precisa servir o `dist` e a API juntos.

### 4. Backends que não são Node

O túnel só precisa de uma porta local com a aplicação. Em outra stack (por exemplo FastAPI ou Flask), mantenha `ligar`, `link` e `desligar` e troque a parte que inicia o servidor, o caminho dos arquivos estáticos e a variável de porta. A senha básica precisa ser reimplementada na stack (ou omitida).

### 5. Testar

```powershell
.\scripts\hospedagem.ps1 ligar -Porta 3011
.\scripts\hospedagem.ps1 desligar -Porta 3011
```

Use uma porta diferente da usual para não interferir em nada que já esteja rodando.

## Segurança e custos

- **Sem `-Senha`, o link é público.** Qualquer pessoa que souber o endereço acessa a API e os arquivos de `/uploads`. Use sem senha apenas com dados fictícios e compartilhe o link só com os participantes.
- Com `-Senha`, a senha fica em `logs/hospedagem-<porta>.json` em texto, para que `link` consiga exibi-la. A pasta `logs/` não vai para o git.
- A `OPENAI_API_KEY` fica no servidor e não é enviada ao navegador. Nunca compartilhe o arquivo `.env`.
- Com `AI_MODE=llm`, cada requisição consome a API da OpenAI. Com o link aberto, qualquer visitante pode gerar custo.
- A máquina precisa ficar ligada, conectada e sem suspender durante a apresentação.
- Encerre com `desligar` assim que terminar.

## Solução de problemas

### O backend não iniciou

O script informa o erro e indica os logs:

```text
logs/backend-<porta>.log
logs/backend-<porta>.log.err
```

Se a porta estiver ocupada, o script avisa. Veja quem a usa ou escolha outra com `-Porta`:

```powershell
Get-NetTCPConnection -LocalPort 3010 -ErrorAction SilentlyContinue
```

### Não aparece o endereço do túnel

Consulte `logs/tunel-<porta>.log`. Algumas redes corporativas bloqueiam a porta `7844`, usada pelo Cloudflare Tunnel. Nesse caso, teste em outra rede (por exemplo, o roteamento do celular) ou use um serviço de túnel alternativo, como o Pinggy (`ssh -p 443 -R0:localhost:3010 a.pinggy.io`). A alternativa não está integrada ao script e não foi testada neste repositório.

### O endereço não abre logo depois de criado

O DNS do túnel novo pode demorar alguns segundos. Aguarde e tente de novo.

### O microfone não aparece

Confirme que o endereço começa com `https://` e autorize o microfone nas permissões do navegador.

### As mudanças no código não aparecem no link

O backend serve a versão compilada. Rode `desligar` e depois `ligar -Rebuild`. O endereço será outro.

### O link mudou

É esperado: cada `ligar` gera um endereço novo. Use `link` para ver o atual.

### Processos iniciados manualmente

`desligar` também encerra o backend que estiver escutando na porta informada e um `cloudflared` apontando para ela, mesmo que não tenham sido iniciados pelo script.

## Referências

- Cloudflare Quick Tunnels: <https://developers.cloudflare.com/tunnel/get-started/quick-tunnels/>
- Releases oficiais do cloudflared: <https://github.com/cloudflare/cloudflared/releases>
