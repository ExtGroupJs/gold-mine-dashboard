from django.db import models
from .wbs import WBS
from .resource import Resource
from .task_resource import TaskResource
from django.utils.translation import gettext_lazy as _


class Task(models.Model):
    task_code = models.CharField(max_length=50, unique=True)
    status_code = models.CharField(max_length=50)
    wbs = models.ForeignKey(WBS, on_delete=models.DO_NOTHING)
    task_name = models.TextField()
    target_drtn_hr_cnt = models.IntegerField()
    # original_duration = models.IntegerField()
    remain_drtn_hr_cnt = models.IntegerField()
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    target_cost = models.DecimalField(max_digits=10, decimal_places=2)
    total_float_hr_cnt = models.IntegerField()
    delete_record_flag = models.BooleanField(default=False)
    resources = models.ManyToManyField(Resource, through=TaskResource)

    class Meta:
        verbose_name = _("Task")
        verbose_name_plural = _("Tasks")

    def __str__(self):
        return self.task_code
