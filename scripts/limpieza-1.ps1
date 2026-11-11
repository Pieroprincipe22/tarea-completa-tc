# scripts/limpieza-1.ps1
#
# Paso 1 de la limpieza de AnPi Tech.
# Borra ficheros que ninguna parte del proyecto importa.
# Comprobado contra el codigo el 11/11/2026: cero referencias
# en apps/api, apps/web, apps/mobile, apps/marketing, pruebas y e2e.
#
# Antes de ejecutarlo: haz commit y push de tu trabajo.
#
# Uso, desde la raiz del proyecto:
#   .\scripts\limpieza-1.ps1

$ErrorActionPreference = 'Stop'

$raiz = Split-Path -Parent $PSScriptRoot

# Seguro: no borra nada si no estamos en el proyecto correcto.
$marca = Join-Path $raiz 'pnpm-workspace.yaml'
if (-not (Test-Path $marca)) {
    Write-Host "No encuentro pnpm-workspace.yaml en $raiz" -ForegroundColor Red
    Write-Host "Ejecuta el script desde la carpeta del proyecto." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Limpieza paso 1 en: $raiz" -ForegroundColor Cyan
Write-Host ""

$archivos = @(
    'apps\web\src\components\DashboardCards.tsx',
    'apps\web\src\components\DashboardPage.tsx',
    'apps\web\src\components\ModuleLanding.tsx',
    'apps\web\src\lib\api.ts',
    'apps\web\src\lib\session.ts',
    'apps\web\src\lib\tenant.ts',
    'apps\web\src\lib\types.ts',
    'apps\web\public\brand\princore-logo.png',
    'apps\web\public\next.svg',
    'apps\web\public\vercel.svg',
    'apps\web\public\file.svg',
    'apps\web\public\globe.svg',
    'apps\web\public\window.svg',
    'apps\mobile\README.md',
    'apps\mobile\LICENSE',
    'apps\mobile\scripts\reset-project.js'
)

$carpetas = @(
    'apps\api\src\prisma',
    'apps\mobile\scripts'
)

$borrados = 0
$ausentes = 0

foreach ($rel in $archivos) {
    $ruta = Join-Path $raiz $rel
    if (Test-Path -LiteralPath $ruta -PathType Leaf) {
        Remove-Item -LiteralPath $ruta -Force
        Write-Host "  borrado   $rel" -ForegroundColor Green
        $borrados = $borrados + 1
    }
    else {
        Write-Host "  no estaba $rel" -ForegroundColor DarkGray
        $ausentes = $ausentes + 1
    }
}

foreach ($rel in $carpetas) {
    $ruta = Join-Path $raiz $rel
    if (Test-Path -LiteralPath $ruta -PathType Container) {
        Remove-Item -LiteralPath $ruta -Recurse -Force
        Write-Host "  borrada   $rel\" -ForegroundColor Green
        $borrados = $borrados + 1
    }
    else {
        Write-Host "  no estaba $rel\" -ForegroundColor DarkGray
        $ausentes = $ausentes + 1
    }
}

Write-Host ""
Write-Host "Borrados: $borrados    Ya no estaban: $ausentes" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora pega los otros 2 archivos y comprueba con:" -ForegroundColor Yellow
Write-Host "  pnpm typecheck" -ForegroundColor Yellow
Write-Host "  pnpm test" -ForegroundColor Yellow
Write-Host ""