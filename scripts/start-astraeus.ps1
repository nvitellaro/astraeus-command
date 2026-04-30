Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\Users\Nicholas Vitellaro\astraeus-command"
$FrontendPath = Join-Path $ProjectRoot "frontend"

$FrontendUrl = "http://localhost:5174"
$BackendHealthUrl = "http://localhost:5001/api/health"
$BackendDbUrl = "http://localhost:5001/api/health/db"
$NeoWsUrl = "http://localhost:5001/api/neows/upcoming"

Write-Host ""
Write-Host "========================================"
Write-Host "STARTING ASTRAEUS COMMAND"
Write-Host "========================================"

Set-Location -Path $ProjectRoot

Write-Host ""
Write-Host "Starting Docker services..."
docker compose up -d

Write-Host ""
Write-Host "Waiting for FastAPI backend..."

$backendReady = $false

for ($i = 1; $i -le 30; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $BackendHealthUrl -UseBasicParsing -TimeoutSec 2

        if ($response.StatusCode -eq 200) {
            $backendReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 2
    }

    Write-Host ("Waiting... attempt {0}/30" -f $i)
}

if ($backendReady -eq $false) {
    Write-Host ""
    Write-Host "ERROR: Backend did not become ready."
    Write-Host "Run this command to inspect logs:"
    Write-Host "docker compose logs backend"
    exit 1
}

Write-Host "Backend is healthy."

Write-Host ""
Write-Host "Checking database health..."

try {
    Invoke-WebRequest -Uri $BackendDbUrl -UseBasicParsing -TimeoutSec 5 | Out-Null
    Write-Host "Database is healthy."
}
catch {
    Write-Host "WARNING: Database health check failed. Continuing anyway."
}

Write-Host ""
Write-Host "Running NeoWs ETL..."
docker compose exec backend sh -c "PYTHONPATH=/app python etl/neows_etl.py"

Write-Host ""
Write-Host "Checking NeoWs API endpoint..."

try {
    Invoke-WebRequest -Uri $NeoWsUrl -UseBasicParsing -TimeoutSec 10 | Out-Null
    Write-Host "NeoWs endpoint is responding."
}
catch {
    Write-Host "WARNING: NeoWs endpoint check failed. Continuing anyway."
}

Write-Host ""
Write-Host "Starting React frontend..."

Start-Process powershell -WorkingDirectory $FrontendPath -ArgumentList @(
    "-NoExit",
    "-Command",
    "npm run dev"
)

Write-Host ""
Write-Host "Waiting for frontend to initialize..."
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Opening Astraeus Command in browser..."
Start-Process $FrontendUrl

Write-Host ""
Write-Host "========================================"
Write-Host "ASTRAEUS COMMAND READY"
Write-Host "========================================"
Write-Host ("Frontend: {0}" -f $FrontendUrl)
Write-Host ("Backend:  {0}" -f $NeoWsUrl)
Write-Host ""
Write-Host "Ready for Step 23."
Write-Host ""