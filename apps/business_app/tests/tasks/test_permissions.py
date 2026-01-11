import pytest
from django.urls import reverse
from unittest.mock import patch

from apps.common.baseclass_for_testing import BaseTestClass
from apps.users_app.models.groups import Groups
from model_bakery import baker
from apps.business_app.models.task import Task
from rest_framework import status


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
        allowed_groups = [
            Groups.PLANNER,
            Groups.DASHBOARD_CLIENT,
        ]

        random_quantity = baker.random_gen.gen_integer(min_int=5, max_int=10)
        print(random_quantity)

        baker.make(Task, _quantity=random_quantity)
        assert (
            trigger_mock.call_count == random_quantity * 2
        )  # both dashboards are updated

        self.user.is_superuser = False
        self.user.is_staff = False
        self.client.force_authenticate(self.user)

        # testing for planner and dashboard client the full list is retrieved
        for role in allowed_groups:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            request = self.client.get(url)
            self.assertEqual(request.status_code, status.HTTP_200_OK)

    # def test_get_post_put_patch_protocols(self):
    #     """
    #     Se puede acceder con cualquier rol, siempre y cuando sea un usuario registrado
    #     """
    #     url = reverse("task-list")
    #     allowed_groups = [Groups.PLANNER, Groups.DASHBOARD_CLIENT]
    #     test_protocols = [self.client.post, self.client.put, self.client.patch]
    #     for protocol in test_protocols:
    #         self._test_permissions(
    #             url, allowed_roles=allowed_groups, request_using_protocol=protocol
    #         )

    # def test_get_one_protocol(self):
    #     """
    #     Se puede acceder con cualquier rol, siempre y cuando sea un usuario registrado
    #     """
    #     test_task = baker.make(
    #         Task,
    #     )
    #     url = reverse("task-detail", kwargs={"pk": test_task.id})
    #     allowed_groups = [Groups.PLANNER, Groups.DASHBOARD_CLIENT]

    #     self._test_permissions(
    #         url, allowed_roles=allowed_groups, request_using_protocol=self.client.get
    #     )

    # def test_post_protocol(self):
    #     """
    #     Solo el PLANNER y el DASHBOARD_CLIENT pueden introducir datos
    #     """
    #     url = reverse("task-list")
    #     allowed_groups = [Groups.PLANNER, Groups.DASHBOARD_CLIENT]

    #     self._test_permissions(
    #         url, allowed_roles=allowed_groups, request_using_protocol=self.client.post
    #     )

    # def test_put_patch_delete_protocols(self):
    #     """
    #     Solo el PLANNER y el DASHBOARD_CLIENT pueden cambiar datos
    #     """
    #     test_task = baker.make(
    #         Task,
    #     )
    #     url = reverse("task-detail", kwargs={"pk": test_task.id})
    #     allowed_groups = [Groups.PLANNER, Groups.DASHBOARD_CLIENT]
    #     test_protocols = [self.client.put, self.client.patch, self.client.delete]
    #     for protocol in test_protocols:
    #         self._test_permissions(
    #             url, allowed_roles=allowed_groups, request_using_protocol=protocol
    #         )

    # def test_move_to_another_shop(self):
    #     """
    #     Solo el PLANNER y el DASHBOARD_CLIENT pueden invocar este EP
    #     """
    #     test_task = baker.make(
    #         Task,
    #     )
    #     url = reverse("task-move-to-another-shop", kwargs={"pk": test_task.id})
    #     allowed_groups = [Groups.PLANNER, Groups.DASHBOARD_CLIENT]

    #     self._test_permissions(
    #         url,
    #         allowed_roles=allowed_groups,
    #         request_using_protocol=self.client.post,
    #     )
