$ErrorActionPreference = "Stop"

$rootDir = Resolve-Path (Join-Path $PSScriptRoot "..")
$pidFile = Join-Path $rootDir "scripts/.backend.pid"
$logFile = Join-Path $rootDir "scripts/.backend.log"

if (Test-Path $pidFile) {
    $existingPid = Get-Content $pidFile -Raw
    if ($existingPid -and (Get-Process -Id $existingPid -ErrorAction SilentlyContinue)) {
        Write-Host "Backend already running with PID $existingPid"
        exit 0
    }
}

$backendDir = Join-Path $rootDir "backend"
$process = Start-Process -FilePath "uv" -ArgumentList "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload" -WorkingDirectory $backendDir -RedirectStandardOutput $logFile -RedirectStandardError $logFile -PassThru
Set-Content -Path $pidFile -Value $process.Id

Write-Host "Backend started on http://localhost:8000 (PID $($process.Id))"
Write-Host "Logs: $logFile"
