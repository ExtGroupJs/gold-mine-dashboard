from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from .models.task import Task
from .models.alert import Alert
from .utils.pusher_client import PusherClient
from .utils.task_counters import get_task_counters


# def update_inventory(inc_pos_dec_neg, instance):
#     """
#     The increment only defines the operation, if is -1 the value is decremented, if +1, incremented
#     """
#     related_product = ShopProducts.objects.filter(id=instance.shop_product.id).first()
#     if related_product:
#         related_product.quantity += inc_pos_dec_neg * instance.quantity
#         related_product.save(update_fields=["quantity"])


@receiver(post_save, sender=Task)
def update_dashboard(sender, instance, **kwargs):
    pusher_client = PusherClient()
    pusher_client.trigger("dashboard-channel", "update-event", get_task_counters())


@receiver(post_save, sender=Alert)
def notify_created_alert(sender, instance, **kwargs):
    pusher_client = PusherClient()
    pusher_client.trigger(
        "dashboard-channel",
        "new-alert-event",
        {
            "task": instance.task.task_name,
            "alert_description": instance.short_description,
            "level": f"{instance.KIND(instance.kind).label}",
        },
    )

@receiver(pre_delete, sender=Alert)
def notify_deleted_alert(sender, instance, **kwargs):
    pusher_client = PusherClient()
    pusher_client.trigger(
        "dashboard-channel",
        "deleted-alert-event",
        {
            "task": instance.task.task_name,
            "alert_description": instance.short_description,
            "level": f"{instance.KIND(instance.kind).label}",
        },
    )


# @receiver(post_delete, sender=Sell)
# def restored_inventory(sender, instance, **kwargs):
#     update_inventory(inc_pos_dec_neg=1, instance=instance)
