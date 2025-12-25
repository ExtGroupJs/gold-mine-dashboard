from django.db import models
from .wbs import WBS
from .resource import Resource
from .task_resource import TaskResource
from django.utils.translation import gettext_lazy as _


class Task(models.Model):
    task_code = models.CharField(max_length=50, unique=True, verbose_name="Activity ID")
    status_code = models.CharField(max_length=50, verbose_name="Activity Status")
    wbs = models.ForeignKey(WBS, on_delete=models.DO_NOTHING, verbose_name="WBS Code")
    task_name = models.TextField(verbose_name="Activity Name")
    target_drtn_hr_cnt = models.IntegerField(verbose_name="Original Duration(d)")
    # original_duration = models.IntegerField()
    remain_drtn_hr_cnt = models.IntegerField(verbose_name="Remaining Duration(d)")
    start_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Start")
    end_date = models.DateTimeField(null=True, blank=True, verbose_name="(*)Finish")
    target_cost = models.DecimalField(
        max_digits=10, decimal_places=2, verbose_name="(*)Budgeted Total Cost($)"
    )
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
