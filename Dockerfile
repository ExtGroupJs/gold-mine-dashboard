FROM python:3.11-slim

# Establecer variables de entorno
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements
COPY requirements.txt /app/

# Instalar dependencias de Python
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar toda la aplicación
COPY project_site/ /app/project_site/
COPY apps/ /app/apps/
COPY manage.py /app/
COPY entrypoint.sh /app/

# Copiar archivos estáticos y templates (si existen)
COPY static/ /app/static/
COPY templates/ /app/templates/

# Crear directorios necesarios
RUN mkdir -p /app/static_output /app/media

# Dar permisos de ejecución al entrypoint
RUN chmod +x /app/entrypoint.sh

# Crear usuario no-root para ejecutar la aplicación
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

USER appuser

# Exponer puerto
EXPOSE 8000

# Entrypoint
ENTRYPOINT ["/app/entrypoint.sh"]