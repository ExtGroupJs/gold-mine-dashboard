"""
Tareas asíncronas de Celery para la aplicación business_app.
"""
from celery import shared_task
from .utils.pusher_client import PusherClient
from .utils.counters import (
    get_task_counters,
    get_alert_counters,
    get_daily_work_summary_for_test,
)
import logging

logger = logging.getLogger(__name__)


@shared_task(name='business_app.send_pusher_trigger', ignore_result=True)
def send_pusher_trigger_task(channel, event, data):
    """
    Tarea asíncrona genérica para enviar eventos a través de Pusher.
    
    Args:
        channel: Canal de Pusher donde enviar el evento
        event: Nombre del evento
        data: Datos a enviar con el evento
    """
    try:
        pusher_client = PusherClient()
        pusher_client.trigger(channel, event, data)
        logger.info(f"Pusher trigger sent: channel={channel}, event={event}")
    except Exception as e:
        logger.error(f"Error sending Pusher trigger: {e}", exc_info=True)
        raise


@shared_task(name='business_app.send_update_management_dashboard', ignore_result=True)
def send_update_management_dashboard_task():
    """
    Tarea asíncrona para actualizar el dashboard de gestión.
    """
    try:
        pusher_client = PusherClient()
        data = get_daily_work_summary_for_test()
        pusher_client.trigger(
            PusherClient.MANAGEMENT_DASHBOARD_CHANNEL,
            PusherClient.UPDATE_TASK_EVENT,
            data
        )
        logger.info("Management dashboard update sent via Pusher")
    except Exception as e:
        logger.error(f"Error updating management dashboard: {e}", exc_info=True)
        raise


@shared_task(name='business_app.send_update_task_dashboard', ignore_result=True)
def send_update_task_dashboard_task():
    """
    Tarea asíncrona para actualizar el dashboard de tareas.
    """
    try:
        pusher_client = PusherClient()
        data = get_task_counters()
        pusher_client.trigger(
            PusherClient.DASHBOARD_CHANNEL,
            PusherClient.UPDATE_TASK_EVENT,
            data
        )
        logger.info("Task dashboard update sent via Pusher")
    except Exception as e:
        logger.error(f"Error updating task dashboard: {e}", exc_info=True)
        raise


@shared_task(name='business_app.send_update_alert_dashboard', ignore_result=True)
def send_update_alert_dashboard_task():
    """
    Tarea asíncrona para actualizar el dashboard de alertas.
    """
    try:
        pusher_client = PusherClient()
        data = get_alert_counters()
        pusher_client.trigger(
            PusherClient.DASHBOARD_CHANNEL,
            PusherClient.UPDATE_ALERT_EVENT,
            data
        )
        logger.info("Alert dashboard update sent via Pusher")
    except Exception as e:
        logger.error(f"Error updating alert dashboard: {e}", exc_info=True)
        raise


@shared_task(name='business_app.notify_created_alert', ignore_result=True)
def notify_created_alert_task(alert_id, task_name, short_description, kind, deleted=False):
    """
    Tarea asíncrona para notificar la creación o eliminación de una alerta.
    
    Args:
        alert_id: ID de la alerta
        task_name: Nombre de la tarea asociada
        short_description: Descripción corta de la alerta
        kind: Tipo de alerta
        deleted: Si la alerta está marcada como eliminada
    """
    try:
        from .models import Alert
        
        pusher_client = PusherClient()
        payload = {
            "task": task_name,
            "alert_description": short_description,
            "level": f"{Alert.KIND(kind).label}",
        }
        event = (
            PusherClient.NEW_ALERT_EVENT
            if not deleted
            else PusherClient.DELETED_ALERT_EVENT
        )
        pusher_client.trigger(PusherClient.ALERT_CHANNEL, event, payload)
        logger.info(f"Alert notification sent: alert_id={alert_id}, event={event}")
    except Exception as e:
        logger.error(f"Error notifying alert: {e}", exc_info=True)
        raise
