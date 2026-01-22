# Despliegue con Docker y Nginx

Esta configuración permite desplegar la aplicación Django con Nginx, Gunicorn, Celery, PostgreSQL y Redis.

## Estructura de Servicios

- **nginx**: Servidor web que maneja archivos estáticos y hace proxy a Django (puerto 80)
- **web**: Aplicación Django servida con Gunicorn (puerto 8000, solo interno)
- **postgres**: Base de datos PostgreSQL (puerto 5432)
- **redis**: Broker de mensajes para Celery (puerto 6379)
- **celery_worker**: Procesa tareas asíncronas en segundo plano
- **celery_beat**: Programador de tareas periódicas

## Archivos Creados

- `Dockerfile`: Imagen para Django/Gunicorn y Celery
- `Dockerfile.nginx`: Imagen personalizada de Nginx
- `nginx.conf`: Configuración de Nginx con proxy reverso
- `entrypoint.sh`: Script de inicialización (migraciones, collectstatic, gunicorn)
- `docker-compose.yml`: Configuración para producción
- `docker-compose-dev.yml`: Configuración para desarrollo local
- `.dockerignore`: Archivos a excluir de las builds de Docker

## Despliegue en Producción

### 1. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto con las variables necesarias:

```bash
# Django
SECRET_KEY=tu-secret-key-super-segura
DEBUG=False
ALLOWED_HOSTS=tudominio.com,www.tudominio.com,localhost

# Sitio
WEBSITE_NAME=Gold Mine Dashboard
WEBSITE_SLUG_NAME=goldmine

# Base de datos
DB_REMOTE_NAME=gold_mine_db
DB_REMOTE_USER=postgres
DB_REMOTE_PASSWORD=password-seguro
DB_REMOTE_PORT=5432

# Email
EMAIL_HOST_USER=tu-email@gmail.com
EMAIL_HOST_PASSWORD=tu-password
DEFAULT_FROM_EMAIL=noreply@tudominio.com
EMAIL_PORT=587

# Redis
REDIS_PORT=6379
CELERY_BASE_REDIS_URL=redis://redis:

# Otros
SESSION_EXPIRE_SECONDS=3600
NGINX_PORT=80
RUNNING_FROM=remote
CACHE_DEFAULT_TIMEOUT=3600
```

### 2. Construir y levantar los servicios

```powershell
# Construir las imágenes
docker-compose build

# Levantar todos los servicios
docker-compose up -d

# Ver los logs
docker-compose logs -f

# Ver logs de un servicio específico
docker-compose logs -f web
docker-compose logs -f nginx
```

### 3. Verificar el despliegue

- Aplicación web: `http://localhost` (o tu dominio)
- Health check: `http://localhost/health/`
- Admin de Django: `http://localhost/admin/`

### 4. Comandos útiles

```powershell
# Ver el estado de los servicios
docker-compose ps

# Detener los servicios
docker-compose down

# Detener y eliminar volúmenes
docker-compose down -v

# Reiniciar un servicio específico
docker-compose restart web
docker-compose restart nginx

# Ejecutar migraciones manualmente
docker-compose exec web python manage.py migrate

# Crear superusuario
docker-compose exec web python manage.py createsuperuser

# Acceder al shell de Django
docker-compose exec web python manage.py shell

# Ver logs en tiempo real
docker-compose logs -f --tail=100
```

## Desarrollo Local

### Opción 1: Script automatizado (Recomendado)

El script `start_dev.ps1` levanta automáticamente todos los servicios necesarios:

```powershell
# Ejecutar el script de desarrollo
.\start_dev.ps1
```

Esto iniciará:

1. PostgreSQL y Redis en Docker
2. Celery Worker en segundo plano
3. Celery Beat en segundo plano
4. Servidor de desarrollo Django

Para detener, presiona `Ctrl+C` en el servidor Django. Luego detén los contenedores:

```powershell
docker-compose -f docker-compose-dev.yml down
```

### Opción 2: Manual

```powershell
# 1. Levantar solo PostgreSQL y Redis
docker-compose -f docker-compose-dev.yml up -d

# 2. Activar entorno virtual
.\venv\Scripts\Activate.ps1

# 3. Aplicar migraciones
python manage.py migrate

# 4. Iniciar Celery Worker (en una terminal separada)
.\start_celery_worker.ps1

# 5. Iniciar Celery Beat (en otra terminal separada)
.\start_celery_beat.ps1

# 6. Iniciar servidor Django
python manage.py runserver
```

### Scripts de desarrollo disponibles

- `start_dev.ps1`: Inicia todo el entorno de desarrollo completo
- `start_celery_worker.ps1`: Inicia solo el Celery Worker
- `start_celery_beat.ps1`: Inicia solo el Celery Beat

## Configuración de Nginx

El archivo `nginx.conf` incluye:

- **Proxy reverso** a Django/Gunicorn en el puerto 8000
- **Archivos estáticos** servidos directamente desde `/app/static_output/` (ruta `/static_output/`)
- **Archivos de media** servidos desde `/app/media/` (ruta `/media/`)
- **Timeouts** configurados para solicitudes largas (120s)
- **WebSocket support** para futuras funcionalidades
- **Health check** endpoint en `/health/`

## Configuración de Gunicorn

En `entrypoint.sh`, Gunicorn está configurado con:

- 4 workers
- 2 threads por worker
- Timeout de 120 segundos
- Logs en stdout/stderr

Puedes ajustar estos valores editando el archivo `entrypoint.sh`.

## Producción con SSL/HTTPS

Para habilitar HTTPS en producción:

1. Obtén certificados SSL (Let's Encrypt con Certbot)
2. Modifica `nginx.conf` para incluir:

```nginx
server {
    listen 443 ssl http2;
    server_name tudominio.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Resto de la configuración...
}

server {
    listen 80;
    server_name tudominio.com;
    return 301 https://$server_name$request_uri;
}
```

3. Monta los certificados en el contenedor de Nginx en `docker-compose.yml`:

```yaml
nginx:
  volumes:
    - ./ssl:/etc/nginx/ssl:ro
```

## Monitoreo

### Logs

```powershell
# Todos los servicios
docker-compose logs -f

# Solo errores
docker-compose logs -f | Select-String -Pattern "error" -CaseSensitive:$false

# Logs de Nginx
docker-compose logs -f nginx

# Logs de Celery
docker-compose logs -f celery_worker
```

### Recursos

```powershell
# Ver uso de recursos
docker stats

# Ver procesos
docker-compose top
```

## Troubleshooting

### La aplicación no inicia

```powershell
# Ver logs detallados
docker-compose logs web

# Verificar que PostgreSQL está listo
docker-compose exec postgres pg_isready

# Reiniciar el servicio web
docker-compose restart web
```

### Archivos estáticos no se muestran

```powershell
# Recolectar archivos estáticos manualmente
docker-compose exec web python manage.py collectstatic --noinput

# Verificar permisos
docker-compose exec web ls -la /app/static_output
```

### Celery no procesa tareas

```powershell
# Ver logs de Celery
docker-compose logs celery_worker

# Verificar conexión a Redis
docker-compose exec redis redis-cli ping

# Reiniciar worker
docker-compose restart celery_worker
```

### Problemas con el entrypoint.sh en Windows

Si tienes problemas con el formato de línea del archivo `entrypoint.sh`:

```powershell
# Instalar dos2unix si no lo tienes
# O usar Git para convertir
git add --renormalize entrypoint.sh
```

## Backup y Restauración

### Backup de la base de datos

```powershell
# Crear backup
docker-compose exec postgres pg_dump -U postgres gold_mine_db > backup_$(Get-Date -Format "yyyyMMdd").sql

# Con compresión (requiere 7zip o similar)
docker-compose exec postgres pg_dump -U postgres gold_mine_db | Out-File -Encoding utf8 "backup_$(Get-Date -Format 'yyyyMMdd').sql"
```

### Restaurar base de datos

```powershell
# Desde SQL plano
Get-Content backup_20260119.sql | docker-compose exec -T postgres psql -U postgres gold_mine_db
```

## Actualización

Para actualizar la aplicación:

```powershell
# 1. Hacer pull de los cambios
git pull origin main

# 2. Reconstruir imágenes
docker-compose build

# 3. Detener servicios
docker-compose down

# 4. Levantar con nuevas imágenes
docker-compose up -d

# 5. Verificar logs
docker-compose logs -f
```

## Seguridad

### Checklist de producción:

- ✅ `DEBUG=False` en `.env`
- ✅ `SECRET_KEY` segura y única
- ✅ `ALLOWED_HOSTS` configurado correctamente
- ✅ PostgreSQL con contraseña fuerte
- ✅ Redis protegido (solo accesible en red interna)
- ✅ Archivos sensibles en `.dockerignore`
- ✅ Usuario no-root en contenedores
- ✅ Volúmenes para persistencia de datos
- ⬜ SSL/HTTPS habilitado (recomendado)
- ⬜ Firewall configurado en el servidor
- ⬜ Backups automáticos configurados

## Diferencias con el proyecto original (allele-viewer-dinamic)

Esta configuración está basada en la rama `281-celeri-integration` del repositorio `Ezq-code/allele-viewer-dinamic` pero adaptada para el proyecto Gold Mine Dashboard. Las principales diferencias son:

1. Nombres de variables de entorno adaptados al proyecto
2. Eliminación de variables específicas de allele-viewer (SPREADSHEET*ID, CREDENTIAL_FILE_NAME, STRIPE*\*)
3. Mantenimiento de las variables propias del proyecto (WEBSITE_NAME, WEBSITE_SLUG_NAME)

## Recursos adicionales

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Gunicorn Documentation](https://docs.gunicorn.org/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Celery Documentation](https://docs.celeryq.dev/)
- [Django Deployment Checklist](https://docs.djangoproject.com/en/stable/howto/deployment/checklist/)
