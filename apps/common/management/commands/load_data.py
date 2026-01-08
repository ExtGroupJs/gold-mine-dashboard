from django.core.management import call_command
from django.core.management.base import BaseCommand
from termcolor import colored

from apps.users_app.models.groups import Groups
from django.contrib.auth.models import User
from apps.users_app.models.system_user import SystemUser


class Command(BaseCommand):
    help = "Loads initial fixtures"

    def handle(self, *args, **options):
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

        call_command("loaddata", "resources.json")
        print(
            colored(
                "Successfully added Resources to system",
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
        planner, _ = SystemUser.objects.get_or_create(
            username="planner",
            defaults={
                "email": "",
                "first_name": "Planner",
                "last_name": "User",
            },
        )
        planner.groups.add(Groups.PLANNER)
        planner.set_password("1234")
        planner.save()
        print(
            colored(
                "Created planner_user with PLANNER role",
                "blue",
                attrs=["blink"],
            )
        )
        supervisor_a, _ = SystemUser.objects.get_or_create(
            username="supervisor_a",
            defaults={
                "email": "",
                "first_name": "Supervisor A",
                "last_name": "User",
            },
        )
        supervisor_a.groups.add(Groups.SUPERVISOR_AREA_A)
        supervisor_a.set_password("1234")
        supervisor_a.save()
        print(
            colored(
                "Created supervisor_a with SUPERVISOR_AREA_A role",
                "blue",
                attrs=["blink"],
            )
        )
        supervisor_b, _ = SystemUser.objects.get_or_create(
            username="supervisor_b",
            defaults={
                "email": "",
                "first_name": "Supervisor B",
                "last_name": "User",
            },
        )
        supervisor_b.groups.add(Groups.SUPERVISOR_AREA_B)
        supervisor_b.set_password("1234")
        supervisor_b.save()
        print(
            colored(
                "Created supervisor_b with SUPERVISOR_AREA_B role",
                "blue",
                attrs=["blink"],
            )
        )
        supervisor_c, _ = SystemUser.objects.get_or_create(
            username="supervisor_c",
            defaults={
                "email": "",
                "first_name": "Supervisor C",
                "last_name": "User",
            },
        )
        supervisor_c.groups.add(Groups.SUPERVISOR_AREA_C)
        supervisor_c.set_password("1234")
        supervisor_c.save()
        print(
            colored(
                "Created supervisor_c with SUPERVISOR_AREA_C role",
                "blue",
                attrs=["blink"],
            )
        )

        board_client, _ = SystemUser.objects.get_or_create(
            username="board_client",
            defaults={
                "email": "",
                "first_name": "Board Client",
                "last_name": "User",
            },
        )
        board_client.groups.add(Groups.DASHBOARD_CLIENT)
        board_client.set_password("1234")
        board_client.save()

        print(
            colored(
                "Created board_client with DASHBOARD_CLIENT role",
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
