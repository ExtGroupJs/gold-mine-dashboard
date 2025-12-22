from django.db import models
from django.utils.translation import gettext_lazy as _


class BaseModel(models.Model):
    created_timestamp = models.DateTimeField(
        verbose_name=_("Created timestamp"), auto_now_add=True
    )
    updated_timestamp = models.DateTimeField(
        verbose_name=_("Updated timestamp"), auto_now=True, null=True
    )

    class Meta:
        abstract = True
