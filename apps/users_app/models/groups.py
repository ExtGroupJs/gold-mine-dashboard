from django.db import models
from django.utils.translation import gettext_lazy as _


class Groups(models.IntegerChoices):
    # ** Administrativo
    SUPER_ADMIN = 1, _("Super Admin")
    EDITOR = 2, _("Editor")
    READER = 3, _("Lector")
