[CmdletBinding()]
param(
  [string]$HostAddr = '127.0.0.1',
  [string]$StartPath = '/ATAR1/index.html',
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

function Open-ExternalBrowser([string]$Url) {
  # `start` treats the first quoted argument as a window title; use "" explicitly (not an empty PowerShell string).
  Start-Process 'cmd' -ArgumentList @('/c', 'start', '""', $Url) | Out-Null
}

function Open-VSCodeSimpleBrowser([string]$Url) {
  # Command URIs pass arguments as a JSON-encoded array.
  # simpleBrowser.show expects the URL as its first argument.
  $json = ConvertTo-Json @($Url) -Compress
  $encoded = [System.Uri]::EscapeDataString($json)
  Start-Process ("vscode://command/simpleBrowser.show?$encoded") | Out-Null
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

$watchArg = '--watch=ATAR1,prompts'
$comspec = $env:ComSpec

$preferredPort = 5500

function Start-LiveServerProcess([int]$Port) {
  return Start-Process -FilePath $comspec -ArgumentList @(
      '/c', 'npx', '--yes', 'live-server', '.',
      "--host=$HostAddr",
      "--port=$Port",
      '--no-browser',
      "--wait=$WaitMs",
      $watchArg
    ) -NoNewWindow -PassThru
}

function Announce-And-Open([string]$Url) {
  Write-Host "DEV_SERVER_READY $Url"
  Open-ExternalBrowser -Url $Url
  Open-VSCodeSimpleBrowser -Url $Url
}

# Outer loop: always keep a server running; if port changes, re-open previews.
while ($true) {
  $triedPreferred = $false
  while ($true) {
    if (-not $triedPreferred -and (Test-PortFree -Port $preferredPort)) {
      $port = $preferredPort
      $triedPreferred = $true
    } else {
      $port = Get-FreeTcpPort
    }

    $url = "http://$HostAddr`:$port$StartPath"
    Write-Host "Starting persistent dev server on $url"

    $proc = Start-LiveServerProcess -Port $port

    if (Wait-HttpReady -Url $url) {
      Announce-And-Open -Url $url
      break
    }

    Write-Host "DEV_SERVER_NOT_READY $url"
    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
    Start-Sleep -Seconds 1
  }

  # Keep the server alive on the same port; if that stops working, select a new port.
  while ($true) {
    Wait-Process -Id $proc.Id
    Start-Sleep -Seconds 1

    $url = "http://$HostAddr`:$port$StartPath"
    Write-Host "live-server exited. Restarting on $url"

    $proc = Start-LiveServerProcess -Port $port

    if (Wait-HttpReady -Url $url -MaxTries 40 -DelayMs 250) {
      Write-Host "DEV_SERVER_READY $url"
      continue
    }

    try { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } catch {}
    Write-Host "Restart failed on $url; selecting a new port"
    break
  }
}
