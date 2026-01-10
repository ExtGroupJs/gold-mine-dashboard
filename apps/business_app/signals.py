from django.db.models.signals import post_save
from django.dispatch import receiver
from .models.task import Task
from .models.alert import Alert
from .utils.pusher_client import PusherClient
from .utils.counters import (
    get_task_counters,
    get_alert_counters,
    get_daily_work_summary_for_test,
)
import logging

logger = logging.getLogger(__name__)


def send_update_management_dashboard():
    pusher_client = PusherClient()
    data = get_daily_work_summary_for_test()
    pusher_client.trigger(
        PusherClient.MANAGEMENT_DASHBOARD_CHANNEL, PusherClient.UPDATE_TASK_EVENT, data
    )


def send_update_task_dashboard():
    pusher_client = PusherClient()
    data = get_task_counters()
    pusher_client.trigger(
        PusherClient.DASHBOARD_CHANNEL, PusherClient.UPDATE_TASK_EVENT, data
    )


def send_update_alert_dashboard():
    pusher_client = PusherClient()
    data = get_alert_counters()
    pusher_client.trigger(
        PusherClient.DASHBOARD_CHANNEL, PusherClient.UPDATE_ALERT_EVENT, data
    )


@receiver(post_save, sender=Task)
def update_dashboard(sender, instance, **kwargs):
    send_update_task_dashboard()
    send_update_management_dashboard()


@receiver(post_save, sender=Alert)
def notify_created_alert(sender, instance, **kwargs):
    pusher_client = PusherClient()
    payload = {
        "task": instance.task.task_name,
        "alert_description": instance.short_description,
        "level": f"{instance.KIND(instance.kind).label}",
    }
    event = (
        PusherClient.NEW_ALERT_EVENT
        if not instance.deleted
        else PusherClient.DELETED_ALERT_EVENT
    )
    pusher_client.trigger(PusherClient.ALERT_CHANNEL, event, payload)
    send_update_alert_dashboard()
