from django.db import models
from .resource import Resource
from django.utils.translation import gettext_lazy as _

class TaskResource(models.Model):
    task = models.ForeignKey("Task", on_delete=models.CASCADE)
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE)
    # hours_assigned = models.IntegerField()
    
    class Meta:
        verbose_name = _("Task Resource")
        verbose_name_plural = _("Task Resources")       
