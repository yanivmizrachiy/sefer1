[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

function Exec-Git([string[]]$ArgumentList) {
  & git @ArgumentList
  if ($LASTEXITCODE -ne 0) {
    throw "git failed ($LASTEXITCODE): git $($ArgumentList -join ' ')"
  }
}

# Ensure git uses the tracked hooks folder
Exec-Git -ArgumentList @('config', 'core.hooksPath', '.githooks')

# Show status for visibility
$hooksPath = (& git config core.hooksPath)
Write-Host "GIT_HOOKS_PATH_READY $hooksPath"
