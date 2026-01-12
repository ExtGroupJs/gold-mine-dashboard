from django.db import models
from django.utils.translation import gettext_lazy as _
from ..models.resource_owner import ResourceOwner


class Resource(models.Model):
    name = models.CharField(max_length=100, unique=True)
    resource_type = models.CharField(max_length=50, null=True, blank=True)
    fuel_spent_by_hour = models.FloatField(default=0)
    rent_cost_by_hour_in_euros = models.FloatField(default=0)
    processed_volume_by_hour = models.FloatField(default=0)
    processed_area_by_hour = models.FloatField(default=0)
    owner = models.ForeignKey(
        to=ResourceOwner,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="resources",
    )

    # cost_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        verbose_name = _("Resource")
        verbose_name_plural = _("Resources")

    def __str__(self):
        return self.name
