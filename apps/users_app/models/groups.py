from django.db import models
from django.utils.translation import gettext_lazy as _


class Groups(models.IntegerChoices):
    # ** Administrativo
    SUPER_ADMIN = 1, _("Super Admin")
    PLANNER = 2, _("Planner")
    SUPERVISOR = 3, _("Supervisor")
    DASHBOARD_CLIENT = 4, _("Dashboard Client")
    # ** Operacional
    OPERATOR = 10, _("Operator")
    TECHNICIAN = 11, _("Technician")
