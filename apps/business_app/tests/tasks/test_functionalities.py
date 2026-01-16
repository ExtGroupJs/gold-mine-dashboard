from datetime import datetime, timedelta
import pytest
from django.urls import reverse
from apps.common.baseclass_for_testing import BaseTestClass
from apps.common.models.generic_log import GenericLog
from apps.users_app.models.groups import Groups
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

    def test_list_filtering_by_request_user_role(
        self,
    ):
        """
        Los roles PLANNER, DASHBOARD_CLIENT, MANAGER, pueden ver todas las tareas
        Los supervisores solo las asignadas a ellos.
        """

        url = reverse("task-list")
        self.client.force_authenticate(user=self.user)

        random_qty = baker.random_gen.gen_integer(min_int=2, max_int=5)
        baker.make(Task, _quantity=random_qty)  # Tasks with no specified responsible

        random_supervisor_a_qty = baker.random_gen.gen_integer(min_int=6, max_int=10)
        baker.make(
            Task,
            internal_responsibles=[
                Group.objects.get(id=Groups.SUPERVISOR_AREA_A.value)
            ],
            _quantity=random_supervisor_a_qty,
        )

        random_supervisor_b_qty = baker.random_gen.gen_integer(min_int=11, max_int=15)
        baker.make(
            Task,
            internal_responsibles=[
                Group.objects.get(id=Groups.SUPERVISOR_AREA_B.value)
            ],
            _quantity=random_supervisor_b_qty,
        )

        for role in ROLES_WITH_ACCESS_TO_READ_ALL_TASKS:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                response.data["count"],
                random_qty + random_supervisor_a_qty + random_supervisor_b_qty,
            )
        self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
        self.user.groups.add(Groups.SUPERVISOR_AREA_A)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], random_supervisor_a_qty)

        self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
        self.user.groups.add(Groups.SUPERVISOR_AREA_B)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], random_supervisor_b_qty)
