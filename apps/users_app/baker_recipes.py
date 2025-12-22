from faker import Faker
from model_bakery.recipe import Recipe

from apps.users_app.models import SystemUser

faker = Faker(0)

system_user = Recipe(
    SystemUser,
    first_name=faker.first_name,
    last_name=faker.last_name,
    email=faker.email,
    username=faker.user_name,
)
