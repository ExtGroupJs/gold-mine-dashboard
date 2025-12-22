import uuid

from django.contrib.auth.models import User

# from django.db import models
from django.utils._os import safe_join
from django.utils.translation import gettext_lazy as _

# Create your models here.


def get_file_path(instance, filename):
    ext = filename.split(".")[-1]
    filename = f"{uuid.uuid4()}_{instance.id}.{ext}"
    return safe_join("media/", filename)


class SystemUser(
    User,
):
    # class GENDER(models.TextChoices):
    #     MALE = "M", _("male")
    #     FEMALE = "F", _("female")
    #     OTHER = "O", _("other")

    # class INTERNAL_STATUS(models.TextChoices):
    #     REGISTERED = "R", _("registered")
    #     CONFIRMED = "C", _("confirmed")
    #     PREMIUM = "P", _("premium")

    # internal_status = models.CharField(
    #     _("internal status"),
    #     choices=INTERNAL_STATUS.choices,
    #     default=INTERNAL_STATUS.REGISTERED,
    #     max_length=1,
    # )

    # identification_number = models.CharField(
    #     verbose_name=_("identification number"),
    #     help_text="CI or Passport",
    #     max_length=20,
    #     unique=True,
    # )
    # photo = models.ImageField(
    #     verbose_name=_("photo"),
    #     upload_to="images/",
    #     null=True,
    # )
    # gender = models.CharField(
    #     _("gender"), choices=GENDER.choices, default=GENDER.MALE, max_length=1
    # )

    # phone = models.CharField(
    #     verbose_name=_("phone number"),
    #     max_length=20,
    #     null=True,
    #     blank=True,
    #     validators=[
    #         RegexValidator(regex=r"^\+?\d+$", message="Only numeric characters allowed")
    #     ],
    # )
    # country = models.ForeignKey(to="Country", on_delete=models.CASCADE, null=True)

    class Meta(User.Meta):
        verbose_name = _("System user")
        verbose_name_plural = _("System users")

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
