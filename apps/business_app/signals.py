from django.db.models.signals import post_save
from django.dispatch import receiver
from .models.task import Task
from .models.alert import Alert
from .utils.pusher_client import PusherClient
from .utils.task_counters import get_task_counters, get_alert_counters
import logging

logger = logging.getLogger(__name__)


def send_update_task_dashboard():
    pusher_client = PusherClient()
    data = get_task_counters()
    pusher_client.trigger("dashboard-channel", "update-task-event", data)


def send_update_alert_dashboard():
    pusher_client = PusherClient()
    data = get_alert_counters()
    pusher_client.trigger("dashboard-channel", "update-alert-event", data)


@receiver(post_save, sender=Task)
def update_dashboard(sender, instance, **kwargs):
    send_update_task_dashboard()


@receiver(post_save, sender=Alert)
def notify_created_alert(sender, instance, **kwargs):
    pusher_client = PusherClient()
    payload = {
        "task": instance.task.task_name,
        "alert_description": instance.short_description,
        "level": f"{instance.KIND(instance.kind).label}",
    }
    event = "new-alert-event" if not instance.deleted else "deleted-alert-event"
    pusher_client.trigger("alert-channel", event, payload)
    send_update_alert_dashboard()
