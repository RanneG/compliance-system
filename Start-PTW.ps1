$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$venvPython = Join-Path $root ".venv\Scripts\python.exe"
if (-not (Test-Path $venvPython)) {
  python -m venv .venv
}
& $venvPython -m pip install -q -r (Join-Path $root "backend\requirements.txt")

Push-Location (Join-Path $root "frontend")
if (-not (Test-Path "node_modules")) {
  npm install
}
Pop-Location

Write-Host "Starting Industrial Compliance System"
Write-Host "Manager portal: http://127.0.0.1:5173"
Write-Host "API:            http://127.0.0.1:8787/api/health"

Start-Process -FilePath $venvPython -ArgumentList "-m", "uvicorn", "app.main:app", "--app-dir", "backend", "--host", "127.0.0.1", "--port", "8787" -WorkingDirectory $root
Start-Process -FilePath "npm" -ArgumentList "run", "dev" -WorkingDirectory (Join-Path $root "frontend")
Start-Process "http://127.0.0.1:5173"
