#!/bin/bash

# Script de inicio para la aplicación Django
set -e

echo "Esperando a que la base de datos esté lista..."
# Usar timeout de Python en lugar de nc (no disponible en python:slim)
python << END
import socket
import time
import os
import sys

host = os.environ.get('DB_REMOTE_HOST', 'postgres')
port = int(os.environ.get('DB_REMOTE_PORT', 5432))
max_attempts = 60

for attempt in range(max_attempts):
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(1)
        sock.connect((host, port))
        sock.close()
        print(f"Base de datos lista en {host}:{port}!")
        sys.exit(0)
    except (socket.error, socket.timeout):
        if attempt < max_attempts - 1:
            time.sleep(1)
        else:
            print(f"No se pudo conectar a la base de datos después de {max_attempts} intentos")
            sys.exit(1)
END

# Ejecutar migraciones
echo "Ejecutando migraciones..."
python manage.py migrate --noinput

# Recolectar archivos estáticos
echo "Recolectando archivos estáticos..."
python manage.py collectstatic --noinput --clear

# Crear superusuario si no existe (opcional)
echo "Verificando superusuario..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    print("Creando superusuario admin...")
else:
    print("Superusuario admin ya existe")
END

# Iniciar gunicorn
echo "Iniciando servidor Gunicorn..."
exec gunicorn project_site.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --threads 2 \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
