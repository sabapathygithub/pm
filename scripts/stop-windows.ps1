$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$pidFile = Join-Path $rootDir "scripts/.backend.pid"

if (!(Test-Path $pidFile)) {
    Write-Host "No PID file found. Backend may already be stopped."
    exit 0
}

$pidValue = Get-Content $pidFile -Raw
if ($pidValue -and (Get-Process -Id $pidValue -ErrorAction SilentlyContinue)) {
    Stop-Process -Id $pidValue
    Write-Host "Stopped backend process $pidValue"
} else {
    Write-Host "Process $pidValue not running"
}

Remove-Item $pidFile -ErrorAction SilentlyContinue
