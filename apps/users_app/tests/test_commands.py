import random

import pytest
from django.contrib.auth.models import User
from django.core.management import call_command
from django.core.management.base import CommandError
from model_bakery.exceptions import InvalidQuantityException


@pytest.mark.django_db
def test_default_user_created():
    user = User.objects.filter(username="admin").exists()
    assert user is True


@pytest.mark.django_db
@pytest.mark.parametrize(
    "quantity, response",
    [
        ("", CommandError),
        ("dsfgsfgs", CommandError),
        (-2, InvalidQuantityException),
    ],
)
def test_create_test_users_command_with_invalid_params(quantity, response):
    with pytest.raises(response):
        call_command("create_test_users", quantity)


@pytest.mark.django_db
def test_create_test_users_command_happy_path():
    quantity = random.randint(1, 100)
    call_command("create_test_users", str(quantity))

    user_quantity = User.objects.exclude(username="admin").count()
    assert user_quantity == quantity
