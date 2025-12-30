from django.db import models
from django.utils.translation import gettext_lazy as _


class Groups(models.IntegerChoices):
    r"""Update apps\users_app\fixtures\auth.group.json and run python manage.py load_data"""
    # ** Administrativo
    SUPER_ADMIN = 1, _("Super Admin")
    PLANNER = 2, _("Planner")
    DASHBOARD_CLIENT = 3, _("Dashboard Client")
    
    SUPERVISOR = 11, _("Supervisor")
