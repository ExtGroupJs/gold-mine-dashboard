from django.core.management.base import BaseCommand
from model_bakery import baker


class Command(BaseCommand):
    help = "Create dummy realistic users for the system"
    param = "quantity"

    def add_arguments(self, parser):
        parser.add_argument(self.param, nargs="+", type=int)

    def handle(self, *args, **options):
        quantity = options[self.param][0]
        baker.make_recipe("users_app.system_user", _quantity=quantity)
        print(bcolors.OKCYAN + f"Sucessfully created {quantity} dummy users")


class bcolors:
    HEADER = "\033[95m"
    OKBLUE = "\033[94m"
    OKCYAN = "\033[96m"
    OKGREEN = "\033[92m"
    WARNING = "\033[93m"
    FAIL = "\033[91m"
    ENDC = "\033[0m"
    BOLD = "\033[1m"
    UNDERLINE = "\033[4m"
