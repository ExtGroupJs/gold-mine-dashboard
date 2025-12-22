import uuid

from django.contrib.auth.models import User
from django.db import models
from django.utils._os import safe_join
from django.utils.translation import gettext_lazy as _


class Country(models.Model):
    name = models.CharField(verbose_name=_("Country name"), max_length=50)
    code = models.CharField(verbose_name=_("Country code"), max_length=2)
    enabled = models.BooleanField(verbose_name=_("Enabled"), default=True)

    class Meta:
        verbose_name = _("Country")
        verbose_name_plural = _("Countries")

    def __str__(self):
        return f"{self.name}"
