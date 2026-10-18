# Publicação temporária via Cloudflare Quick Tunnel. Veja docs/PUBLICACAO_TEMPORARIA.md
param(
    [Parameter(Position = 0)][ValidateSet('ligar', 'link', 'desligar')][string]$Acao = 'ligar',
    [int]$Porta = 3010,
    [string]$Senha = '',
    [switch]$Rebuild
)

$ErrorActionPreference = 'Stop'
$Raiz = Split-Path -Parent $PSScriptRoot
$Logs = Join-Path $Raiz 'logs'
$Tools = Join-Path $Raiz 'tools'
$Cloudflared = Join-Path $Tools 'cloudflared.exe'
$Estado = Join-Path $Logs "hospedagem-$Porta.json"
$LogBackend = Join-Path $Logs "backend-$Porta.log"
$LogTunel = Join-Path $Logs "tunel-$Porta.log"

function Testar-Backend {
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:$Porta/api/health" -UseBasicParsing -TimeoutSec 2 `
            -Headers @{ Authorization = 'Basic ' + [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes("u:$Senha")) }
        return $r.StatusCode -eq 200
    } catch { return $false }
}

function Parar-Processo($id) {
    if ($id) { Stop-Process -Id $id -Force -ErrorAction SilentlyContinue }
}

function Mostrar-Link {
    if (-not (Test-Path $Estado)) { Write-Host 'Nenhuma hospedagem ativa nesta porta.'; return }
    $e = Get-Content $Estado -Raw | ConvertFrom-Json
    Write-Host "Endereço: $($e.url)"
    if ($e.senha) { Write-Host "Acesso:   com senha ($($e.senha))" } else { Write-Host 'Acesso:   livre, sem senha' }
}

function Desligar {
    if (Test-Path $Estado) {
        $e = Get-Content $Estado -Raw | ConvertFrom-Json
        Parar-Processo $e.tunelPid
        Parar-Processo $e.backendPid
        Remove-Item $Estado -Force
    }
    # Processos iniciados manualmente: backend na porta e cloudflared apontando para ela
    Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue |
        ForEach-Object { Parar-Processo $_.OwningProcess }
    Get-CimInstance Win32_Process -Filter "Name = 'cloudflared.exe'" |
        Where-Object { $_.CommandLine -like "*localhost:$Porta*" } |
        ForEach-Object { Parar-Processo $_.ProcessId }
    Write-Host 'Hospedagem encerrada.'
}

function Ligar {
    New-Item -ItemType Directory -Force $Logs, $Tools | Out-Null

    if (Test-Path $Estado) { Write-Host 'Já existe hospedagem nesta porta; encerrando a anterior.'; Desligar }
    if (Get-NetTCPConnection -LocalPort $Porta -State Listen -ErrorAction SilentlyContinue) {
        throw "A porta $Porta está ocupada. Use -Porta com outro número."
    }

    # Frontend compilado
    $dist = Join-Path $Raiz 'frontend\dist\index.html'
    if ($Rebuild -or -not (Test-Path $dist)) {
        Write-Host 'Compilando o frontend...'
        Push-Location (Join-Path $Raiz 'frontend')
        try {
            $ErrorActionPreference = 'Continue'   # npm escreve avisos em stderr
            if (-not (Test-Path 'node_modules')) { npm install }
            npm run build
        } finally { $ErrorActionPreference = 'Stop'; Pop-Location }
        if (-not (Test-Path $dist)) { throw 'O build não gerou frontend/dist/index.html.' }
    }

    # cloudflared
    if (-not (Test-Path $Cloudflared)) {
        Write-Host 'Baixando o cloudflared...'
        $url = 'https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe'
        Invoke-WebRequest -Uri $url -OutFile $Cloudflared -UseBasicParsing
    }

    # Servidor
    $env:PORT = "$Porta"
    $env:BASIC_AUTH_PASSWORD = $Senha
    $backend = Start-Process node -ArgumentList (Join-Path $Raiz 'scripts\servidor.mjs') -WorkingDirectory $Raiz `
        -WindowStyle Hidden -PassThru -RedirectStandardOutput $LogBackend -RedirectStandardError "$LogBackend.err"
    $ok = $false
    for ($i = 0; $i -lt 20 -and -not $ok; $i++) { Start-Sleep -Milliseconds 500; $ok = Testar-Backend }
    if (-not $ok) {
        Parar-Processo $backend.Id
        throw "O backend não iniciou. Veja $LogBackend e $LogBackend.err"
    }

    # Túnel
    Remove-Item $LogTunel -Force -ErrorAction SilentlyContinue
    $tunel = Start-Process $Cloudflared -ArgumentList "tunnel --url http://localhost:$Porta --no-autoupdate" `
        -WindowStyle Hidden -PassThru -RedirectStandardOutput "$LogTunel.out" -RedirectStandardError $LogTunel
    $endereco = $null
    for ($i = 0; $i -lt 60 -and -not $endereco; $i++) {
        Start-Sleep -Milliseconds 500
        if (Test-Path $LogTunel) {
            $m = Select-String -Path $LogTunel -Pattern 'https://[a-z0-9-]+\.trycloudflare\.com' -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($m) { $endereco = $m.Matches[0].Value }
        }
    }
    if (-not $endereco) {
        Parar-Processo $tunel.Id; Parar-Processo $backend.Id
        throw "Não foi possível obter o endereço do túnel. Veja $LogTunel"
    }

    @{ url = $endereco; senha = $Senha; backendPid = $backend.Id; tunelPid = $tunel.Id } |
        ConvertTo-Json | Set-Content $Estado -Encoding utf8
    Mostrar-Link
}

switch ($Acao) {
    'ligar'    { Ligar }
    'link'     { Mostrar-Link }
    'desligar' { Desligar }
}
