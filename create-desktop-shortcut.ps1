$ErrorActionPreference = 'Stop'

$projectName = 'sefer1'
$url = 'https://yanivmizrachiy.github.io/sefer1/'

try {
    $desktop = [Environment]::GetFolderPath('Desktop')
    if (-not $desktop) {
        throw 'Could not resolve Desktop folder path.'
    }

    $shortcutPath = Join-Path $desktop ($projectName + '.url')

    $content = @(
        '[InternetShortcut]'
        ('URL=' + $url)
        'IDList='
        'HotKey=0'
        'IconIndex=0'
    ) -join "`r`n"

    Set-Content -LiteralPath $shortcutPath -Value $content -Encoding ASCII -Force

    Write-Host ('Created desktop shortcut: ' + $shortcutPath)
    exit 0
} catch {
    Write-Error $_
    exit 1
}
