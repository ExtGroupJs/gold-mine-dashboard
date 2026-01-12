import pytest
from django.urls import reverse
from unittest.mock import patch

from apps.common.baseclass_for_testing import BaseTestClass
from apps.users_app.models.groups import Groups
from model_bakery import baker
from apps.business_app.models.task import Task

from apps.users_app.models.groups import (
    ROLES_WITH_READ_ACCESS_TO_TASKS,
    ROLES_WITH_WRITE_ACCESS_TO_TASKS,
)


@pytest.mark.django_db
class TestTaskViewSet(BaseTestClass):
    fixtures = ["auth.group.json"]

    def setUp(self):
        super().setUp()

    @patch("apps.business_app.signals.PusherClient.trigger")
    def test_get_protocol(self, trigger_mock):
        """
        Se puede acceder con cualquier rol, siempre y cuando sea un usuario registrado
        """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS
        test_protocols = [self.client.get]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_put_patch_protocols(self):
        """
        Se puede acceder con cualquier rol, siempre y cuando sea un usuario registrado
        """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_WRITE_ACCESS_TO_TASKS
        test_protocols = [self.client.put, self.client.patch]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_acces_to_counter(self):
        """
        Solo el PLANNER, MANAGER y el DASHBOARD_CLIENT pueden invocar este EP
        """
        test_task = baker.make(
            Task,
        )
        url = reverse("task-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )

    def test_acces_to_management_counters(self):
        """
        Solo el PLANNER, MANAGER y el DASHBOARD_CLIENT pueden invocar este EP
        """
        test_task = baker.make(
            Task,
        )
        url = reverse("task-management-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )
