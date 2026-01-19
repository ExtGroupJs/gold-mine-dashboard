from django.db import models
from .task import Task
from django.utils.translation import gettext_lazy as _
from apps.common.mixins.generic_log import GenericLogMixin
from safedelete.models import SafeDeleteModel


class Alert(GenericLogMixin, SafeDeleteModel, models.Model):
    class KIND(models.TextChoices):
        WARNING = "W", _("Warning")  # Amarillo
        CRITICAL = "C", _("Critical")  # Rojo

    class MOTIVES(models.TextChoices):
        SECURITY = "S", _("Seguridad")
        AMBIENTAL = "A", _("Medio Ambiente")
        WEATHER = "W", _("Clima")
        EQUIPMENT = "E", _("Equipamiento")
        PERSONAL = "P", _("Personal")
        REPLACEMENTS = "R", _("Repuestos")
        OTHERS = "O", _("Otros")

    task = models.ForeignKey(
        to=Task, on_delete=models.CASCADE, related_name="alerts", verbose_name=_("Task")
    )
    motive_alert_status = models.CharField(
        _("Motive Alert Status"),
        choices=MOTIVES.choices,
        default=MOTIVES.OTHERS,
        max_length=1,
    )
    kind = models.CharField(
        _("Alert type"),
        choices=KIND.choices,
        default=KIND.WARNING,
        max_length=1,
    )
    short_description = models.CharField(
        max_length=100, verbose_name=_("Short Description")
    )

    def __str__(self):
        return f"{self.short_description} ({self.KIND(self.kind).label})"
