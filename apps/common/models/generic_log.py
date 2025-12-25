from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType
from apps.users_app.models.system_user import SystemUser


class GenericLog(models.Model):
    """
    This class is used for store every action perform on any desired model

    Usage excample: Refers to apps/common/mixins/generic_log.py

    """

    class ACTION(models.TextChoices):
        CREATED = "C", _("creado")
        UPDATED = "U", _("modificado")
        DELETED = "D", _("borrado")

    created_timestamp = models.DateTimeField(
        verbose_name=_("Created timestamp"), auto_now_add=True
    )
    performed_action = models.CharField(
        max_length=1,
        choices=ACTION.choices,
        default=ACTION.CREATED,
        verbose_name=_("Acción"),
    )
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        verbose_name=_("Content Type"),
    )
    object_id = models.IntegerField(_("Object ID"))
    content_object = GenericForeignKey()
    details = models.JSONField(verbose_name=_("Detalles"), null=True)

    created_by = models.ForeignKey(
        SystemUser,
        on_delete=models.SET_NULL,
        null=True,
        verbose_name=_("Created By"),
    )

    class Meta:
        verbose_name = "Log"
        verbose_name_plural = "Logs"

    def __str__(self):
        return f"{self.content_type}-{self.content_object} - {self.performed_action}"
