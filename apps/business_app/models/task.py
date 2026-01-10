from django.db import models
from .wbs import WBS
from .resource import Resource
from .task_resource import TaskResource
from django.utils.translation import gettext_lazy as _
from apps.common.mixins.generic_log import GenericLogMixin
from datetime import datetime, time, timedelta
from django.core.validators import (
    MaxValueValidator,
    MinValueValidator,
)
from django.contrib.auth.models import Group
from django.utils import timezone


class Task(GenericLogMixin, models.Model):
    DEFAULT_TASK_DURATION = 8  # HOURS
    CACHE_KEY_FOR_MANAGEMENT_INFO = "task_info_{task_id}_percent_{percent}"

    ### INTERNAL FIELDS
    class INTERNAL_STATUS(models.TextChoices):
        PLANNED = "P", _("Planned")
        """ESTE ES ADICIONAL INTERNO. Tiene valor en 'internal_planned_date' , no tiene datos en 'act_start_date'"""

        HOLD = "H", _("Hold")
        """ESTE ES ADICIONAL INTERNO. Tiene alerta tipo critical"""

        WARNING = "W", _("Warning")
        """ESTE ES ADICIONAL INTERNO. Tiene alerta tipo warning"""

        BACKLOG = "B", _("Backlog")
        """ESTE ES ADICIONAL INTERNO. Es cuando estaba planificada y no comenzó en tiempo"""

        IN_PROGRESS = (
            "I",
            _("In progress"),
        )
        """ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA"""

        COMPLETED = "C", _("Completed")
        """ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA"""

        NOT_STARTED = "N", _("Not started")
        """ESTE ESTÁ TAMBIÉN EN EL PRIMAVERA"""

    PRIMAVERA_IMPORTED_STATUS = (
        INTERNAL_STATUS.COMPLETED.value,
        INTERNAL_STATUS.NOT_STARTED.value,
        INTERNAL_STATUS.IN_PROGRESS.value,
    )
    internal_status = models.CharField(
        _("internal status"),
        choices=INTERNAL_STATUS.choices,
        default=INTERNAL_STATUS.NOT_STARTED,
        max_length=1,
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
        return f"{self.task_name}"

    @property
    def working_hours_for_test(self):
        return self.complete_pct / 100 * Task.DEFAULT_TASK_DURATION

    @property
    def working_hours_real(self):
        if not self.act_start_date or not self.act_end_date:
            return None

        if self.act_start_date >= self.act_end_date:
            return 0.0

        total_hours = 0.0
        work_start_time = time(8, 0)
        work_end_time = time(16, 0)

        # Convert to aware datetimes if needed
        current = timezone.localtime(self.act_start_date)
        end = timezone.localtime(self.act_end_date)

        while current.date() <= end.date():
            day_start = timezone.make_aware(
                datetime.combine(current.date(), work_start_time)
            )
            day_end = timezone.make_aware(
                datetime.combine(current.date(), work_end_time)
            )

            period_start = max(current, day_start)
            period_end = min(end, day_end)

            if period_start < period_end:
                total_hours += (period_end - period_start).total_seconds() / 3600

            current = day_start + timedelta(days=1)

        return round(total_hours, 2)
