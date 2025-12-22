from apps.common.baseclass_for_testing import BaseTestClass
import pytest
from django.urls import reverse
from model_bakery import baker
from rest_framework import status

from apps.enterprises_app.models.enterprise import Enterprise
from apps.users_app.models import SystemUser


@pytest.mark.django_db
class TestUserViewSet(BaseTestClass):
    # User can be edited
    def test_user_edit(self):
        self.client.force_authenticate(self.user, self.oauth2_token)

        created_user = baker.make(
            SystemUser,
            username=self.faker.user_name(),
            email=self.faker.email(),
            first_name=self.faker.first_name(),
            last_name=self.faker.last_name(),
            identification_number=self.faker.random_number(digits=10),
        )
        url = reverse("users-detail", kwargs={"pk": created_user.id})

        username = self.faker.user_name()
        email = self.faker.email()
        first_name = self.faker.first_name()
        last_name = self.faker.last_name()
        identification_number = self.faker.random_number(digits=10)
        payload = {
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "identification_number": str(identification_number),
        }
        headers = {"Content-Type": "application/json"}
        response = self.client.patch(url, data=payload, format="json", headers=headers)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        created_user.refresh_from_db()
        self.assertEqual(created_user.username, username)
        self.assertEqual(created_user.email, email)
        self.assertEqual(created_user.first_name, first_name)
        self.assertEqual(created_user.last_name, last_name)
        self.assertEqual(created_user.identification_number, str(identification_number))

    # User creation fails if username already exists
    def test_user_create_existing_username(self):
        self.client.force_authenticate(self.user, self.oauth2_token)
        url = reverse("users-list")
        data = {
            "username": "admin",
            "email": "new_user@example.com",
            "first_name": "New",
            "last_name": "User",
            "identification_number": "1234567890",
            "gender": "M",
            "phone": "1234567890",
        }
        response = self.client.post(url, data=data)
        assert response.status_code == 400

    def test_user_update_enterprise(self):
        self.client.force_authenticate(self.user, self.oauth2_token)

        original_enterprise = baker.make(Enterprise)
        created_user = baker.make(SystemUser, enterprise=original_enterprise)
        url = reverse("users-detail", kwargs={"pk": created_user.id})
        new_enterprise = baker.make(Enterprise)

        data = {
            "enterprise_id": new_enterprise.id,
        }
        response = self.client.patch(url, data=data)
        assert response.status_code == 200
        created_user.refresh_from_db()
        assert created_user.enterprise_id == new_enterprise.id

    # User creation fails if identification number already exists
    def test_failed_user_creation_if_existing_identification_number(self):
        self.client.force_authenticate(self.user, self.oauth2_token)
        url = reverse("users-list")
        data = {
            "username": "new_user",
            "email": "new_user@example.com",
            "first_name": "New",
            "last_name": "User",
            "identification_number": "1234567890",
            "gender": "M",
            "phone": "1234567890",
        }
        response = self.client.post(url, data=data)
        assert response.status_code == 400

    # User creation fails if email already exists
    def test_failed_user_creation_if_existing_email(self):
        self.client.force_authenticate(self.user, self.oauth2_token)
        url = reverse("users-list")
        data = {
            "username": "new_user",
            "email": "admin@example.com",
            "first_name": "New",
            "last_name": "User",
            "identification_number": "1234567890",
            "gender": "M",
            "phone": "1234567890",
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_users_list_ep(self):
        self.client.force_authenticate(self.user, self.oauth2_token)
        url = reverse("users-list")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        list_count = response.data["count"]
        self.assertEqual(list_count, SystemUser.objects.count())

    def test_users_list_fail_if_no_auth(self):
        url = reverse("users-list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_new_user_registration_with_is_active_false_as_default(self):
        url = reverse("users-list")

        username = self.faker.user_name()
        password = str(self.faker.random_number(digits=10))
        data = {
            "username": username,
            "email": self.faker.email(),
            "first_name": self.faker.first_name(),
            "last_name": self.faker.last_name(),
            "identification_number": self.faker.random_number(digits=10),
            "gender": "M",
            "password": password,
        }
        response = self.client.post(url, data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(SystemUser.objects.filter(username=username).exists())
        new_user = SystemUser.objects.get(username=username)
        self.assertFalse(new_user.is_active)
