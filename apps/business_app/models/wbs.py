from django.db import models


class WBS(models.Model):
    wbs_id = models.CharField(max_length=100, unique=True)
    wbs_name = models.CharField(max_length=250, null=True, blank=True)
    description = models.TextField(null=True, blank=True)

    class Meta:
        verbose_name = "Work Breakdown Structure (WBS)"
        verbose_name_plural = "Work Breakdown Structures (WBSs)"

    def __str__(self):
        return self.wbs_name
