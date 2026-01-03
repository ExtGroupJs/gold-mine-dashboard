from django.db import models
from .task import Task
from django.utils.translation import gettext_lazy as _
from apps.common.mixins.generic_log import GenericLogMixin
from safedelete.models import SafeDeleteModel


class Alert(GenericLogMixin, SafeDeleteModel, models.Model):
    class KIND(models.TextChoices):
        WARNING = "W", _("Warning")
        CRITICAL = "C", _("Critical")

    task = models.ForeignKey(
        to=Task, on_delete=models.CASCADE, related_name="alerts", verbose_name=_("Task")
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

    description = models.TextField(null=True, blank=True, verbose_name=_("Description"))

    def __str__(self):
        return f"{self.short_description} ({self.KIND(self.kind).label})"
