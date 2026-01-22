"""
Configuración de Celery para el proyecto.
"""
import os
from celery import Celery

# Establecer el módulo de configuración de Django para Celery
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project_site.settings')

app = Celery('project_site')

# Cargar la configuración desde Django settings usando el namespace CELERY
app.config_from_object('django.conf:settings', namespace='CELERY')

# Autodescubrir tareas en todos los archivos tasks.py de las apps instaladas
app.autodiscover_tasks()


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
