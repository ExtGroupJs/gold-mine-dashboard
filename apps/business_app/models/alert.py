from django.db import models
from .models.task import Task


class Alert(models.Model):
    class KIND(models.TextChoices):
        INFO = "I", _("information")
        WARNING = "W", _("warning") 
        CRITICAL = "C", _("critical")
       
    task=models.ForeignKey(to=Task, on_delete=models.CASCADE)
    kind = models.CharField(
        _("Alert type"),
        choices=KIND.choices,
        default=KIND.WARNING,
        max_length=1,
    )
    short_description = models.CharField(max_length=100)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return f"{self.kind} - {self.short_description}"
