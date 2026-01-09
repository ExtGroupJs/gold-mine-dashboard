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


class Task(GenericLogMixin, models.Model):
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
        null=True,
        blank=True,
        max_length=1,
    )
    internal_percent_complete = models.IntegerField(
        _("internal percent complete"),
        default=0,
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
        return f"{self.task_name}"

    def calculate_working_hours(self):
        """
        Calculate working hours between act_start_date and act_end_date,
        considering an 8am-4pm workday schedule across all days of the week.

        Returns:
            float: Total working hours, or None if dates are invalid
        """
        if not self.act_start_date or not self.act_end_date:
            return None

        if self.act_start_date >= self.act_end_date:
            return 0.0

        total_hours = 0.0

        # Workday hours (8am to 4pm)
        work_start_time = time(8, 0)
        work_end_time = time(16, 0)

        current_datetime = self.act_start_date
        end_datetime = self.act_end_date

        while current_datetime.date() <= end_datetime.date():
            # Get the start of the current workday
            day_start = datetime.combine(current_datetime.date(), work_start_time)
            day_end = datetime.combine(current_datetime.date(), work_end_time)

            # Calculate overlap between work hours and the time period
            period_start = max(current_datetime, day_start)
            period_end = min(end_datetime, day_end)

            if period_start < period_end:
                # Calculate hours for this day
                day_hours = (period_end - period_start).total_seconds() / 3600
                total_hours += day_hours

            # Move to the next day
            current_datetime = day_start + timedelta(days=1)

        return round(total_hours, 2)
