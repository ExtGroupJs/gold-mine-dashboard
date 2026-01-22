# Script para iniciar solo Celery Beat
# Útil cuando quieres ejecutar el scheduler de forma independiente

Write-Host "=== Iniciando Celery Beat ===" -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno desde .env
if (Test-Path ".env") {
    Write-Host "Cargando variables de entorno desde .env..." -ForegroundColor Yellow
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*)\s*=\s*(.*)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            # Remover comillas si existen
            $value = $value -replace '^["'']|["'']$', ''
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
    Write-Host "✓ Variables de entorno cargadas" -ForegroundColor Green
    Write-Host ""
}

# Activar entorno virtual
$venvPath = ".\venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "Activando entorno virtual..." -ForegroundColor Yellow
    & $venvPath
    Write-Host "✓ Entorno virtual activado" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se encontró el entorno virtual en .\venv" -ForegroundColor Red
    Write-Host "Ejecuta primero: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Configurar variables de entorno para Celery
$env:CELERY_BROKER_URL = "redis://localhost:6379/0"
$env:CELERY_RESULT_BACKEND = "django-db"

# Verificar que Redis esté corriendo
Write-Host "Verificando conexión a Redis..." -ForegroundColor Yellow
try {
    $redisTest = docker exec ${env:WEBSITE_SLUG_NAME}_redis redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "✓ Redis está listo" -ForegroundColor Green
    } else {
        Write-Host "ADVERTENCIA: Redis no responde. Asegúrate de que esté corriendo:" -ForegroundColor Yellow
        Write-Host "  docker-compose -f docker-compose-dev.yml up -d redis" -ForegroundColor White
    }
} catch {
    Write-Host "ADVERTENCIA: No se pudo verificar Redis" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Iniciando Celery Beat..." -ForegroundColor Yellow
Write-Host "Presiona Ctrl+C para detener" -ForegroundColor Gray
Write-Host ""

# Iniciar Celery Beat con el scheduler de Django Celery Beat
celery -A project_site beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
