from django.core.management import call_command
from django.core.management.base import BaseCommand
from termcolor import colored

from apps.users_app.models.groups import Groups
from django.contrib.auth.models import User

class Command(BaseCommand):
    help = "Loads initial fixtures"

    # def handle(self, *args, **options):
    # # print(
    # #     colored(
    # #         "There's no fixtures to add yet",
    # #         "red",
    # #         attrs=["blink"],
    # #     )
    # # )

    call_command("loaddata", "auth.group.json")
    print(
        colored(
            "Successfully added group permissions",
            "green",
            attrs=["blink"],
        )
    )


    admin_user = User.objects.get(username="admin")
    admin_user.groups.add(Groups.SUPER_ADMIN)
    print(
        colored(
            "Promoted default admin user as SUPER_ADMIN",
            "blue",
            attrs=["blink"],
        )
    )

    # call_command("loaddata", "provinces.json")
    # print(
    # colored(
    # "Successfully added provinces information",
    # "green",
    # attrs=["blink"],
    # )
    # )
    # call_command("loaddata", "municipalities.json")
    # print(
    # colored(
    # "Successfully added municipalities information",
    # "green",
    # attrs=["blink"],
    # )
    # )
    # call_command("loaddata", "popular_councils.json")
    # print(
    # colored(
    # "Successfully added popular councils information",
    # "green",
    # attrs=["blink"],
    # )
    # )
    # call_command("loaddata", "osdes.json")
    # print(
    # colored(
    # "Successfully added osdes information",
    # "green",
    # attrs=["blink"],
    # )
    # )
    # call_command("loaddata", "enterprises.json")
    # print(
    # colored(
    # "Successfully added enterprises information",
    # "green",
    # attrs=["blink"],
    # )
    # )
