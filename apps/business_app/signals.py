from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models.task import Task


# def update_inventory(inc_pos_dec_neg, instance):
#     """
#     The increment only defines the operation, if is -1 the value is decremented, if +1, incremented
#     """
#     related_product = ShopProducts.objects.filter(id=instance.shop_product.id).first()
#     if related_product:
#         related_product.quantity += inc_pos_dec_neg * instance.quantity
#         related_product.save(update_fields=["quantity"])


@receiver(post_save, sender=Task)
def remove_from_inventory(sender, instance, **kwargs):
    pass


# @receiver(post_delete, sender=Sell)
# def restored_inventory(sender, instance, **kwargs):
#     update_inventory(inc_pos_dec_neg=1, instance=instance)
