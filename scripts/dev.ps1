<#
.SYNOPSIS
    DocuMind AI — Developer Commands (Windows PowerShell)

.DESCRIPTION
    Quick commands for common development tasks.
    Equivalent of all scripts/*.sh for Windows users.

.EXAMPLE
    .\scripts\dev.ps1 start        # start dev environment
    .\scripts\dev.ps1 stop         # stop all services
    .\scripts\dev.ps1 logs         # tail all logs
    .\scripts\dev.ps1 logs backend # tail backend logs
    .\scripts\dev.ps1 shell        # shell into backend
    .\scripts\dev.ps1 shell nginx  # shell into nginx
    .\scripts\dev.ps1 dbshell      # psql shell
    .\scripts\dev.ps1 migrate      # run migrations
    .\scripts\dev.ps1 test         # run backend tests
    .\scripts\dev.ps1 seed         # seed development data
    .\scripts\dev.ps1 clean        # reset environment
#>

param(
    [Parameter(Position=0, Mandatory=$true)]
    [ValidateSet("start","stop","logs","shell","dbshell","migrate","test","seed","clean","ps","build")]
    [string]$Command,

    [Parameter(Position=1)]
    [string]$Arg1 = "",

    [switch]$Build,
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path $PSScriptRoot -Parent
Set-Location $ProjectRoot

$COMPOSE = @("compose", "-f", "docker-compose.yml", "-f", "docker-compose.dev.yml")

function Log($msg) { Write-Host "[$Command] $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "[$Command] $msg" -ForegroundColor Yellow }

switch ($Command) {
    "start" {
        if (-not (Test-Path ".env")) {
            Warn ".env not found — copying from .env.example"
            Copy-Item ".env.example" ".env"
        }
        $upArgs = @("up", "--remove-orphans")
        if ($Build) { $upArgs += "--build" }
        if ($Arg1)  { $upArgs += $Arg1 }
        Log "Starting DocuMind AI..."
        Log "Frontend: http://localhost:5173 | Backend: http://localhost:8000 | Via Nginx: http://localhost"
        & docker @COMPOSE @upArgs
    }

    "stop" {
        $downArgs = @("down", "--remove-orphans")
        if ($Volumes) {
            Warn "WARNING: This will delete all database data!"
            $confirm = Read-Host "Type 'yes' to confirm"
            if ($confirm -eq "yes") { $downArgs += "--volumes" }
            else { Log "Aborted."; return }
        }
        Log "Stopping all services..."
        & docker @COMPOSE @downArgs
    }

    "logs" {
        $logsArgs = @("logs", "--follow", "--tail=50")
        if ($Arg1) { $logsArgs += $Arg1 }
        & docker @COMPOSE @logsArgs
    }

    "shell" {
        $service = if ($Arg1) { $Arg1 } else { "backend" }
        $containers = @{
            "backend"  = "documind-backend"
            "frontend" = "documind-frontend"
            "nginx"    = "documind-nginx"
            "postgres" = "documind-postgres"
            "redis"    = "documind-redis"
        }
        $container = $containers[$service]
        if (-not $container) { Write-Error "Unknown service: $service"; return }
        Log "Opening shell in $container..."
        docker exec -it $container sh
    }

    "dbshell" {
        $db = if ($Arg1) { $Arg1 } else { "documind_ai" }
        Log "Connecting to PostgreSQL: $db"
        docker exec -it documind-postgres psql -U postgres -d $db
    }

    "migrate" {
        $cmd = if ($Arg1) { $Arg1 } else { "upgrade head" }
        Log "Running: alembic $cmd"
        docker exec -it documind-backend alembic $cmd.Split(" ")
    }

    "test" {
        Log "Running backend tests..."
        docker exec `
            -e "TEST_DATABASE_URL=postgresql+asyncpg://postgres:postgres@postgres:5432/documind_test" `
            -e "ENVIRONMENT=testing" `
            -e "BCRYPT_ROUNDS=4" `
            -e "GEMINI_API_KEY=fake-key" `
            documind-backend `
            python -m pytest tests/ -v --no-header --tb=short
    }

    "seed" {
        Log "Seeding development database..."
        & .\scripts\seed.sh 2>$null || docker exec documind-backend python -c "print('seed via Python')"
        Log "Seed users: admin@documind.ai/Admin@123, user@documind.ai/User@1234"
    }

    "clean" {
        Warn "WARNING: This will DESTROY all containers and volumes!"
        $confirm = Read-Host "Type 'yes' to confirm"
        if ($confirm -ne "yes") { Log "Aborted."; return }
        & docker @COMPOSE @("down", "--remove-orphans", "--volumes")
        if ($Build) {
            Log "Removing images..."
            docker rmi documind-backend:latest documind-frontend:latest 2>$null
            docker builder prune -f
        }
        Log "Clean complete."
    }

    "ps" {
        & docker @COMPOSE @("ps")
    }

    "build" {
        $buildArgs = @("build")
        if ($Arg1) { $buildArgs += $Arg1 }
        & docker @COMPOSE @buildArgs
    }
}
