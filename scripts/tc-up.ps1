# scripts/tc-up.ps1
# Levanta TODO el entorno de TC Mantenimiento de un tirón:
#   infra (Docker) -> setup BD (solo 1ª vez) -> turbo (API + web)
#
# Uso:
#   cd D:\tc-mantenimiento
#   .\scripts\tc-up.ps1            # arranque normal
#   .\scripts\tc-up.ps1 -Setup     # fuerza reinstalar deps + migrar + seed

param(
  [switch]$Setup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$RepoRoot   = Resolve-Path (Join-Path $PSScriptRoot "..")
$ApiEnv     = Join-Path $RepoRoot "apps\api\.env"
$WebEnv     = Join-Path $RepoRoot "apps\web\.env.local"
$Compose    = Join-Path $RepoRoot "infra\docker-compose.yml"
$SetupFlag  = Join-Path $RepoRoot ".tc-setup-done"

Write-Host "== TC Mantenimiento : arrancando entorno ==" -ForegroundColor Cyan

# 1) Comprobar que Docker está corriendo
try {
  docker info | Out-Null
} catch {
  Write-Host "ERROR: Docker no está corriendo. Abre Docker Desktop y vuelve a intentarlo." -ForegroundColor Red
  exit 1
}

# 2) Asegurar que existe apps/web/.env.local
if (-not (Test-Path $WebEnv)) {
  'NEXT_PUBLIC_API_BASE="http://localhost:3002"' | Set-Content -Encoding UTF8 $WebEnv
  Write-Host "Creado apps/web/.env.local" -ForegroundColor Green
}

# 3) Asegurar que existe apps/api/.env y que tiene un JWT_ACCESS_SECRET
if (-not (Test-Path $ApiEnv)) {
  Write-Host "ERROR: falta apps/api/.env. Créalo con la plantilla que te pasó Claude." -ForegroundColor Red
  exit 1
}

$envContent = Get-Content $ApiEnv -Raw
if ($envContent -match 'JWT_ACCESS_SECRET=""') {
  $bytes = New-Object byte[] 48
  [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
  $secret = [Convert]::ToBase64String($bytes)
  $envContent = $envContent -replace 'JWT_ACCESS_SECRET=""', "JWT_ACCESS_SECRET=`"$secret`""
  $envContent | Set-Content -Encoding UTF8 $ApiEnv
  Write-Host "Generado JWT_ACCESS_SECRET y guardado en apps/api/.env" -ForegroundColor Green
}

# 4) Levantar infra (Postgres, Redis, MinIO)
Write-Host "Levantando infra (Postgres, Redis, MinIO)..." -ForegroundColor Cyan
docker compose -f $Compose up -d

# 5) Esperar a que Postgres acepte conexiones
Write-Host "Esperando a Postgres..." -NoNewline
for ($i = 0; $i -lt 30; $i++) {
  docker exec tc-postgres pg_isready -U tc 2>$null | Out-Null
  if ($LASTEXITCODE -eq 0) { break }
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 1
  Write-Host "." -NoNewline
}
Write-Host " listo." -ForegroundColor Green

# 6) Setup de la BD: solo la primera vez (o con -Setup)
if ($Setup -or -not (Test-Path $SetupFlag)) {
  Write-Host "== Setup inicial (deps + prisma + seed) ==" -ForegroundColor Cyan
  pnpm install
  pnpm db:generate
  pnpm db:migrate
  pnpm db:seed
  New-Item -ItemType File -Path $SetupFlag -Force | Out-Null
  Write-Host "Setup completado." -ForegroundColor Green
} else {
  Write-Host "Setup ya hecho antes (usa -Setup para rehacerlo). Saltando." -ForegroundColor DarkGray
}

# 7) Arrancar API + web con turbo
Write-Host "== Arrancando API (:3002) y web (:3001) con turbo ==" -ForegroundColor Cyan
pnpm dev