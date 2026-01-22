from .tasks import (
    send_update_management_dashboard_task,
    send_update_task_dashboard_task,
    send_update_alert_dashboard_task,
    notify_created_alert_task,
)
import logging

logger = logging.getLogger(__name__)


def send_update_management_dashboard():
    """Envía actualización del dashboard de gestión de manera asíncrona."""
    send_update_management_dashboard_task.delay()


def send_update_task_dashboard():
    """Envía actualización del dashboard de tareas de manera asíncrona."""
    send_update_task_dashboard_task.delay()


def send_update_alert_dashboard():
    """Envía actualización del dashboard de alertas de manera asíncrona."""
    send_update_alert_dashboard_task.delay()


# @receiver(post_save, sender=Task)
# def update_dashboard(sender, instance, **kwargs):
#     send_update_task_dashboard()
#     send_update_management_dashboard()


def notify_created_alert(alert):
    """Notifica la creación de una alerta de manera asíncrona."""
    notify_created_alert_task.delay(
        alert_id=alert.id,
        task_name=alert.task.task_name,
        short_description=alert.short_description,
        kind=alert.kind,
        deleted=alert.deleted,
    )
