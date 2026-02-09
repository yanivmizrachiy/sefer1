[CmdletBinding()]
param(
  [string]$HostAddr = '127.0.0.1',
  [string]$StartPath = '/%D7%90%D7%AA%D7%A8/index.html',
  [int]$WaitMs = 100
)

$ErrorActionPreference = 'Stop'

function Get-FreeTcpPort {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, 0)
  $listener.Start()
  $port = ($listener.LocalEndpoint).Port
  $listener.Stop()
  return $port
}

function Test-PortFree([int]$Port) {
  try {
    $client = [System.Net.Sockets.TcpClient]::new()
    $iar = $client.BeginConnect('127.0.0.1', $Port, $null, $null)
    $connected = $iar.AsyncWaitHandle.WaitOne(150)
    $client.Close()
    return (-not $connected)
  } catch {
    return $true
  }
}

function Wait-HttpReady([string]$Url, [int]$MaxTries = 80, [int]$DelayMs = 200) {
  for ($i = 0; $i -lt $MaxTries; $i++) {
    try {
      Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 1 | Out-Null
      return $true
    } catch {
      Start-Sleep -Milliseconds $DelayMs
    }
  }
  return $false
}

function Start-LiveServerProcess([int]$Port) {
  $comspec = $env:ComSpec
  return Start-Process -FilePath $comspec -ArgumentList @(
      '/c', 'npx', '--yes', 'live-server', '.',
      "--host=$HostAddr",
      "--port=$Port",
      '--ignore=node_modules',
      '--ignore=.git',
      '--ignore=.playwright-profile',
      '--no-browser',
      "--wait=$WaitMs"
    ) -NoNewWindow -PassThru
}

function Start-PlaywrightProcess([string]$Url) {
  $repoRoot = Resolve-Path (Join-Path -Path $PSScriptRoot -ChildPath '..')
  $nodeArgs = @(
    (Join-Path $repoRoot 'tools\\playwright-open.js'),
    $Url
  )

  return Start-Process -FilePath 'node' -ArgumentList $nodeArgs -WorkingDirectory $repoRoot -PassThru
}

$preferredPort = 5500

Write-Host 'Starting persistent dev server (Playwright)'

# Start server on preferred port if possible, else pick a free one.
if (Test-PortFree -Port $preferredPort) {
  $port = $preferredPort
} else {
  $port = Get-FreeTcpPort
}

$url = "http://$HostAddr`:$port$StartPath"
Write-Host "Starting live-server on $url"

$serverProc = Start-LiveServerProcess -Port $port
if (-not (Wait-HttpReady -Url $url)) {
  try { Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue } catch {}
  throw "DEV_SERVER_NOT_READY $url"
}

Write-Host "DEV_SERVER_READY $url"

# Ensure Playwright dependencies exist; if not, print a clear hint.
try {
  node -e "require('playwright');" | Out-Null
} catch {
  Write-Host 'PLAYWRIGHT_NOT_INSTALLED Run: npm install; npx playwright install'
}

$pwProc = $null
while ($true) {
  if (-not $pwProc -or $pwProc.HasExited) {
    Write-Host "Starting Playwright Chromium on $url"
    $pwProc = Start-PlaywrightProcess -Url $url
  }

  if ($serverProc.HasExited) {
    Write-Host 'live-server exited; restarting'
    $serverProc = Start-LiveServerProcess -Port $port
    if (-not (Wait-HttpReady -Url $url -MaxTries 40 -DelayMs 250)) {
      try { Stop-Process -Id $serverProc.Id -Force -ErrorAction SilentlyContinue } catch {}
      Write-Host 'Restart failed; selecting a new port'
      $port = Get-FreeTcpPort
      $url = "http://$HostAddr`:$port$StartPath"
      $serverProc = Start-LiveServerProcess -Port $port
      if (-not (Wait-HttpReady -Url $url)) {
        throw "DEV_SERVER_NOT_READY $url"
      }
      Write-Host "DEV_SERVER_READY $url"
    }
  }

  Start-Sleep -Seconds 1
}
