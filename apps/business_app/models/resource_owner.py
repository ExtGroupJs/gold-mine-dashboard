from django.db import models
from django.utils.translation import gettext_lazy as _


class ResourceOwner(models.Model):
    name = models.CharField(max_length=100, unique=True)

    # cost_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    class Meta:
        verbose_name = _("Resource Owner")
        verbose_name_plural = _("Resources Owner")

    def __str__(self):
        return self.name
