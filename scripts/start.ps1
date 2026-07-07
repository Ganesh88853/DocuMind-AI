<#
.SYNOPSIS
    DocuMind AI — Start Development Environment (Windows PowerShell)

.DESCRIPTION
    Starts all DocuMind AI services with hot reload enabled.
    Equivalent of ./scripts/start.sh for Windows users.

.PARAMETER Build
    Force rebuild of all images.

.PARAMETER Service
    Start only a specific service (e.g., backend, frontend).

.EXAMPLE
    .\scripts\start.ps1              # start everything
    .\scripts\start.ps1 -Build      # rebuild and start
    .\scripts\start.ps1 backend     # start only backend
#>

param(
    [switch]$Build,
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent

Set-Location $ProjectRoot

# ── Ensure .env exists ────────────────────────────────────────────────────────
if (-not (Test-Path ".env")) {
    Write-Host "[start] .env not found — copying from .env.example" -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
    Write-Host "[start] Edit .env and set GEMINI_API_KEY before continuing." -ForegroundColor Yellow
    Read-Host "Press ENTER to continue with defaults"
}

# ── Build args ────────────────────────────────────────────────────────────────
$Args = @(
    "compose",
    "-f", "docker-compose.yml",
    "-f", "docker-compose.dev.yml",
    "up",
    "--remove-orphans"
)

if ($Build) { $Args += "--build" }
if ($Service) { $Args += $Service }

Write-Host "[start] Starting DocuMind AI development environment..." -ForegroundColor Green
Write-Host "[start] Frontend (Vite HMR): http://localhost:5173" -ForegroundColor Cyan
Write-Host "[start] Backend (API):        http://localhost:8000" -ForegroundColor Cyan
Write-Host "[start] API Docs:             http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host "[start] Via Nginx:            http://localhost" -ForegroundColor Cyan

& docker @Args
