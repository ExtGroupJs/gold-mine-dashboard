from django.forms import model_to_dict
from django.contrib.contenttypes.models import ContentType
from apps.common.middlewares import get_current_user
from apps.common.models.generic_log import GenericLog


class GenericLogMixin:
    """
    This class allows to store every change on any field of on any desired model as an instance of GenericLog model.

    Usage example:

    class YourModel(GenericLogMixin, SafeDeleteModel, ...):

    NOTICE: This class should be the first because it override the save and delete methods,
    optionally but as good practice, you should inherit as well of SafeDeleteModel in the second place,
    this way when the object is deleted, the reference is stored and the trazability can be done.
    """

    def save(self, *args, **kwargs):
        updated_object_dict = model_to_dict(self)
        action = GenericLog.ACTION.UPDATED
        details = {}
        if self.pk is not None:
            original_object = self.__class__.objects.get(pk=self.pk)
            for field, new_value in updated_object_dict.items():
                old_value = getattr(original_object, field)
                incoming_value = getattr(self, field)

                if old_value != incoming_value:
                    if hasattr(old_value, "_meta"):
                        old_value = old_value.__str__()

                    if hasattr(incoming_value, "_meta"):
                        new_value = incoming_value.__str__()

                    details[field] = {
                        "old_value": old_value,
                        "new_value": new_value,
                    }
        else:
            action = GenericLog.ACTION.CREATED
            for field, new_value in updated_object_dict.items():
                if new_value:
                    incoming_value = getattr(self, field)
                    if hasattr(incoming_value, "_meta"):
                        new_value = incoming_value.__str__()
                    details[field] = {
                        "old_value": None,
                        "new_value": new_value,
                    }
        super().save(*args, **kwargs)
        if details:
            user = get_current_user()

            GenericLog.objects.create(
                performed_action=action,
                content_type=ContentType.objects.get_for_model(self.__class__),
                object_id=self.pk,
                details=details,
                created_by_id=user and user.id,
            )

    def delete(self, *args, **kwargs):
        GenericLog.objects.create(
            performed_action=GenericLog.ACTION.DELETED,
            content_type=ContentType.objects.get_for_model(self.__class__),
            object_id=self.pk,
        )
        super().delete(*args, **kwargs)
