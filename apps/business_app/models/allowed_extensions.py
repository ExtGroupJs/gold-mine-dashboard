from django.db import models
from django.utils.translation import gettext_lazy as _


class AllowedExtensions(models.Model):
    extension = models.CharField(
        verbose_name=_("file extension"),
        max_length=5,
    )
    typical_app_name = models.CharField(
        verbose_name=_("Application"),
        max_length=150,
    )

    class Meta:
        verbose_name = _("Allowed extension")
        verbose_name_plural = _("allowed Extensions")

    def __str__(self):
        return f"{self.typical_app_name}({self.extension})"
