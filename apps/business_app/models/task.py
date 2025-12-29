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


class Task(GenericLogMixin, models.Model):
    ### INTERNAL FIELDS
    class INTERNAL_STATUS(models.TextChoices):
        PLANNED = "P", _("Planned")  # ESTE ES ADICIONAL INTERNO
        HOLD = "H", _("Hold")  # ESTE ES ADICIONAL INTERNO

        IN_PROGRESS = (  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA
            "I",
            _("In progress"),
        )
        COMPLETED = "C", _("Completed")  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA
        NOT_STARTED = "N", _("Not started")  # ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA

    internal_status = models.CharField(
        _("internal status"),
        choices=INTERNAL_STATUS.choices,
        null=True,
        blank=True,
        max_length=1,
    )
    percent_complete = models.IntegerField(
        _("percent complete"),
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    planned_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Planned Date"
    )
    responsibles = models.ManyToManyField(
        "users_app.SystemUser", verbose_name="Responsible User(s)", blank=True
    )

    # P6 FIELDS
    task_code = models.CharField(max_length=50, unique=True, verbose_name="Activity ID")
    status_code = models.CharField(max_length=50, verbose_name="Activity Status")
    wbs = models.ForeignKey(WBS, on_delete=models.DO_NOTHING, verbose_name="WBS Code")
    task_name = models.TextField(verbose_name="Activity Name")
    target_drtn_hr_cnt = models.IntegerField(verbose_name="Original Duration(d)")
    # original_duration = models.IntegerField()
    remain_drtn_hr_cnt = models.IntegerField(verbose_name="Remaining Duration(d)")
    start_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Start")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Finish")
    act_start_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Actual Start"
    )
    act_end_date = models.DateTimeField(
        null=True, blank=True, verbose_name="Actual Finish"
    )
    target_cost = models.FloatField(verbose_name="(*)Budgeted Total Cost($)")
    total_float_hr_cnt = models.IntegerField(verbose_name="(*)Total Float(d)")
    delete_record_flag = models.BooleanField(
        default=False, verbose_name="Delete This Row"
    )
    resources = models.ManyToManyField(
        Resource, through=TaskResource, verbose_name="(*)Resources"
    )

    class Meta:
        verbose_name = _("Task")
        verbose_name_plural = _("Tasks")

    def __str__(self):
        return self.task_code
