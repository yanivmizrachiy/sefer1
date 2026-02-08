[CmdletBinding()]
param(
  [string]$HostAddr = '127.0.0.1',
  # Keep this URL-encoded so Windows PowerShell codepages won't break Hebrew paths.
  [string]$StartPath = '/%D7%90%D7%AA%D7%A8/index.html',
  [int]$WaitMs = 100,
  [int]$ReopenIntervalSec = 20
)

$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path -Path $PSScriptRoot -ChildPath '..')

# IMPORTANT: This shim must not contain Hebrew string literals.
# Windows PowerShell may parse non-ASCII script contents using a legacy codepage,
# which corrupts Hebrew characters and breaks path resolution.

$candidates = Get-ChildItem -Path $repoRoot -Recurse -Filter '*.ps1' -File |
  Where-Object { $_.FullName -notmatch '\\tools\\' }

$target = $null
foreach ($f in $candidates) {
  try {
    if (Select-String -Path $f.FullName -Pattern 'DEV_SERVER_READY' -Quiet) {
      $target = $f.FullName
      break
    }
  } catch {
    continue
  }
}

if (-not $target) {
  throw 'Missing target script (could not locate a dev script containing DEV_SERVER_READY).'
}

& $target -HostAddr $HostAddr -StartPath $StartPath -WaitMs $WaitMs -ReopenIntervalSec $ReopenIntervalSec
