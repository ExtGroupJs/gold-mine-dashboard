import pytest
from django.urls import reverse
from unittest.mock import patch

from apps.common.baseclass_for_testing import BaseTestClass
from apps.users_app.models.groups import Groups

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
        """ """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS
        test_protocols = [self.client.get]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_put_patch_protocols(self):
        """ """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_WRITE_ACCESS_TO_TASKS
        test_protocols = [self.client.put, self.client.patch]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_acces_to_counter(self):
        """ """
        url = reverse("task-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )

    def test_acces_to_management_counters(self):
        """ """
        url = reverse("task-management-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )
