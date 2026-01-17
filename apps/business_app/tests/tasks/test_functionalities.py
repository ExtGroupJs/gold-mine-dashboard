import pytest
from django.urls import reverse
from apps.common.baseclass_for_testing import BaseTestClass
from django.contrib.auth.models import Group
from model_bakery import baker
from rest_framework import status
from apps.business_app.models.task import Task


from apps.users_app.models.groups import (
    ROLES_WITH_ACCESS_TO_READ_ALL_TASKS,
)


@pytest.mark.django_db
class TestTaskViewSet(BaseTestClass):
    fixtures = ["auth.group.json"]

    def setUp(self):
        super().setUp()
        self.user.is_superuser = False
        self.user.is_staff = False

    def test_list_filtering_by_request_user_role_dynamic(
        self,
    ):
        """
        Los roles PLANNER, DASHBOARD_CLIENT, MANAGER, pueden ver todas las tareas
        Los supervisores solo las asignadas a ellos.
        """

        url = reverse("task-list")
        self.client.force_authenticate(user=self.user)
        roles_with_restricted_access = self._get_not_allowed_groups(
            ROLES_WITH_ACCESS_TO_READ_ALL_TASKS
        )
        created_task_by_specific_roles = {}
        total_created_tasks = 0
        for role in roles_with_restricted_access:
            quantity_to_create = baker.random_gen.gen_integer(min_int=2, max_int=5)
            total_created_tasks += quantity_to_create
            created_task_by_specific_roles[role] = quantity_to_create
            baker.make(
                Task,
                internal_responsibles=[Group.objects.get(id=role.value)],
                _quantity=quantity_to_create,
            )
        print(created_task_by_specific_roles)
        for role in ROLES_WITH_ACCESS_TO_READ_ALL_TASKS:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            print("Role with full_access:", role)
            self.assertEqual(response.data["count"], total_created_tasks)
        for role in roles_with_restricted_access:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                response.data["count"], created_task_by_specific_roles[role]
            )
