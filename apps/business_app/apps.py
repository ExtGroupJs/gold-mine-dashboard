from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class BusinessAppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.business_app"
    verbose_name = _("Business Specific Application")
