from django.db import models


class WBS(models.Model):
    wbs_id = models.CharField(max_length=100, unique=True)
    description = models.TextField()

    def __str__(self):
        return self.wbs_id
