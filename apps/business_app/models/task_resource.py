from django.db import models
from .task import Task
from .resource import Resource

class TaskResource(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE)
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE)
    hours_assigned = models.IntegerField()
    
    class Meta:
        unique_together = ['task', 'resource']