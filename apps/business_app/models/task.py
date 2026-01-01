from django.db import models
from .wbs import WBS
from .resource import Resource
from .task_resource import TaskResource
from django.utils.translation import gettext_lazy as _
from apps.common.mixins.generic_log import GenericLogMixin
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.contrib.auth.models import Group


class Task(GenericLogMixin, models.Model):
    ### INTERNAL FIELDS

    class INTERNAL_STATUS(models.TextChoices):
        PLANNED = "P", _("Planned")  # ESTE ES ADICIONAL INTERNO
        HOLD = "H", _("Hold")  # ESTE ES ADICIONAL INTERNO
        BACKLOG = "B", _("Backlog")  # ESTE ES ADICIONAL INTERNO

        IN_PROGRESS = (  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA
            "I",
            _("In progress"),
        )
        COMPLETED = "C", _("Completed")  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA
        NOT_STARTED = "N", _("Not started")  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA

    PRIMAVERA_IMPORTED_STATUS = (
        INTERNAL_STATUS.COMPLETED.value,
        INTERNAL_STATUS.NOT_STARTED.value,
        INTERNAL_STATUS.IN_PROGRESS.value,
    )
    internal_status = models.CharField(
        _("internal status"),
        choices=INTERNAL_STATUS.choices,
        null=True,
        blank=True,
        max_length=1,
    )
    internal_percent_complete = models.IntegerField(
        _("percent complete"),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    internal_planned_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Planned Date"
    )
    internal_responsibles = models.ManyToManyField(
        Group, verbose_name="Responsible Roles(s)", blank=True
    )

    # P6 FIELDS
    task_code = models.CharField(max_length=50, unique=True, verbose_name="Activity ID")
    status_code = models.CharField(max_length=50, verbose_name="Activity Status")
    wbs = models.ForeignKey(WBS, on_delete=models.DO_NOTHING, verbose_name="WBS Code")
    task_name = models.TextField(verbose_name="Activity Name")
    # original_duration = models.IntegerField()
    start_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Start")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Finish")
    act_start_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Actual Start"
    )
    act_end_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Actual Finish"
    )
    delete_record_flag = models.BooleanField(
        default=False, verbose_name="Delete This Row"
    )
    complete_pct = models.IntegerField(
        _("percent complete"),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    resources = models.ManyToManyField(
        Resource, through=TaskResource, verbose_name="(*)Resources"
    )

    class Meta:
        verbose_name = _("Task")
        verbose_name_plural = _("Tasks")

    def __str__(self):
        return self.task_code
