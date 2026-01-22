# Script para iniciar el entorno de desarrollo completo
# Levanta Docker, Celery Worker, Celery Beat y el servidor Django

Write-Host "=== Iniciando Entorno de Desarrollo Completo ===" -ForegroundColor Cyan
Write-Host ""

# Cargar variables de entorno desde .env
if (Test-Path ".env") {
    Write-Host "[0/5] Cargando variables de entorno desde .env..." -ForegroundColor Yellow
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
} else {
    Write-Host "ADVERTENCIA: No se encontró el archivo .env" -ForegroundColor Yellow
    Write-Host ""
}

# Activar entorno virtual
$venvPath = ".\venv\Scripts\Activate.ps1"
if (Test-Path $venvPath) {
    Write-Host "[1/5] Activando entorno virtual..." -ForegroundColor Yellow
    & $venvPath
    Write-Host "✓ Entorno virtual activado" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se encontró el entorno virtual en .\venv" -ForegroundColor Red
    Write-Host "Ejecuta primero: python -m venv venv" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Levantar servicios de Docker (PostgreSQL y Redis)
Write-Host "[2/5] Levantando servicios Docker (PostgreSQL y Redis)..." -ForegroundColor Yellow
docker-compose -f docker-compose-dev.yml up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: No se pudieron levantar los servicios Docker" -ForegroundColor Red
    exit 1
}

Write-Host "✓ Servicios Docker iniciados" -ForegroundColor Green
Write-Host ""

# Esperar a que los servicios estén listos
Write-Host "Esperando a que los servicios estén listos..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar Redis
$redisTest = docker exec ${env:WEBSITE_SLUG_NAME}_redis redis-cli ping 2>$null
if ($redisTest -eq "PONG") {
    Write-Host "✓ Redis está listo" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Redis no responde correctamente" -ForegroundColor Yellow
}

# Verificar PostgreSQL
$postgresTest = docker exec ${env:WEBSITE_SLUG_NAME}_postgres pg_isready -U postgres 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ PostgreSQL está listo" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: PostgreSQL no responde correctamente" -ForegroundColor Yellow
}

Write-Host ""

# Aplicar migraciones
Write-Host "[3/5] Aplicando migraciones de base de datos..." -ForegroundColor Yellow
python manage.py migrate
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Migraciones aplicadas" -ForegroundColor Green
} else {
    Write-Host "ADVERTENCIA: Error al aplicar migraciones" -ForegroundColor Yellow
}

Write-Host ""

# Configurar variables de entorno para Celery usando valores de .env
$redisPort = if ($env:REDIS_PORT) { $env:REDIS_PORT } else { "6379" }
$serverName = if ($env:SERVER_NAME) { $env:SERVER_NAME } else { "localhost" }
$env:CELERY_BROKER_URL = "redis://${serverName}:${redisPort}/0"
$env:CELERY_RESULT_BACKEND = "django-db"

# Iniciar Celery Worker en segundo plano
Write-Host "[4/5] Iniciando Celery Worker..." -ForegroundColor Yellow
$celeryBrokerUrl = $env:CELERY_BROKER_URL
$workerJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & $using:venvPath
    $env:CELERY_BROKER_URL = $using:celeryBrokerUrl
    $env:CELERY_RESULT_BACKEND = "django-db"
    celery -A project_site worker --loglevel=info --pool=solo
}

Start-Sleep -Seconds 2
if ($workerJob.State -eq "Running") {
    Write-Host "✓ Celery Worker iniciado (Job ID: $($workerJob.Id))" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se pudo iniciar Celery Worker" -ForegroundColor Red
    Get-Job | Remove-Job -Force
    exit 1
}

Write-Host ""

# Iniciar Celery Beat en segundo plano
Write-Host "[5/5] Iniciando Celery Beat..." -ForegroundColor Yellow
$beatJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    & $using:venvPath
    $env:CELERY_BROKER_URL = $using:celeryBrokerUrl
    $env:CELERY_RESULT_BACKEND = "django-db"
    celery -A project_site beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
}

Start-Sleep -Seconds 2
if ($beatJob.State -eq "Running") {
    Write-Host "✓ Celery Beat iniciado (Job ID: $($beatJob.Id))" -ForegroundColor Green
} else {
    Write-Host "ERROR: No se pudo iniciar Celery Beat" -ForegroundColor Red
    Get-Job | Remove-Job -Force
    docker-compose -f docker-compose-dev.yml down
    exit 1
}

Write-Host ""
Write-Host "=== Todos los servicios iniciados correctamente ===" -ForegroundColor Green
Write-Host ""
Write-Host "Servicios activos:" -ForegroundColor Cyan
$dbPort = if ($env:DB_REMOTE_PORT) { $env:DB_REMOTE_PORT } else { "5432" }
Write-Host "  • PostgreSQL:    ${serverName}:${dbPort}" -ForegroundColor White
Write-Host "  • Redis:         ${serverName}:${redisPort}" -ForegroundColor White
Write-Host "  • Celery Worker: Job ID $($workerJob.Id)" -ForegroundColor White
Write-Host "  • Celery Beat:   Job ID $($beatJob.Id)" -ForegroundColor White
Write-Host ""
Write-Host "Iniciando servidor de desarrollo Django..." -ForegroundColor Yellow
Write-Host ""

# Iniciar servidor Django
python manage.py runserver

# Limpieza al finalizar
Write-Host ""
Write-Host "Deteniendo servicios..." -ForegroundColor Yellow
Get-Job | Stop-Job
Get-Job | Remove-Job -Force
Write-Host "✓ Celery Worker y Beat detenidos" -ForegroundColor Green

Write-Host ""
Write-Host "Para detener los contenedores Docker, ejecuta:" -ForegroundColor Cyan
Write-Host "  docker-compose -f docker-compose-dev.yml down" -ForegroundColor White
Write-Host ""
