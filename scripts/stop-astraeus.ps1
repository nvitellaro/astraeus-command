$ErrorActionPreference = "SilentlyContinue"

$ProjectRoot = "C:\Users\Nicholas Vitellaro\astraeus-command"

Write-Host ""
Write-Host "========================================"
Write-Host "🛑 STOPPING ASTRAEUS COMMAND"
Write-Host "========================================"

Set-Location $ProjectRoot

Write-Host ""
Write-Host "🐳 Stopping Docker stack..."
docker compose down

Write-Host ""
Write-Host "🧹 Closing frontend dev servers..."
Get-Process node | Stop-Process -Force

Write-Host ""
Write-Host "🧹 Closing local Python/FastAPI processes if any..."
Get-Process python | Stop-Process -Force

Write-Host ""
Write-Host "========================================"
Write-Host "✅ ASTRAEUS COMMAND STOPPED CLEANLY"
Write-Host "========================================"