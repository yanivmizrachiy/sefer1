[CmdletBinding()]
param(
  [string]$HostAddr = '127.0.0.1',
  # Keep this URL-encoded so Windows PowerShell codepages won't break Hebrew paths.
  [string]$StartPath = '/%D7%90%D7%AA%D7%A8/index.html',
  [int]$WaitMs = 100
)

$ErrorActionPreference = 'Stop'

$target = Join-Path -Path $PSScriptRoot -ChildPath '..\כלים\פיתוח-מתמשך.ps1'
if (-not (Test-Path -LiteralPath $target)) {
  throw "Missing target script: $target"
}

& $target -HostAddr $HostAddr -StartPath $StartPath -WaitMs $WaitMs
