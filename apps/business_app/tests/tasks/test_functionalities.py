import pytest
from django.urls import reverse
from apps.common.baseclass_for_testing import BaseTestClass
from django.contrib.auth.models import Group
from model_bakery import baker
from rest_framework import status
from apps.business_app.models.task import Task
from apps.business_app.models.alert import Alert
from apps.business_app.utils.pusher_client import PusherClient
from datetime import timedelta
from django.utils import timezone
from unittest.mock import patch


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
        for role in ROLES_WITH_ACCESS_TO_READ_ALL_TASKS:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(response.data["count"], total_created_tasks)
        for role in roles_with_restricted_access:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            response = self.client.get(url)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertEqual(
                response.data["count"], created_task_by_specific_roles[role]
            )

    @patch.object(PusherClient, "trigger")
    def test_patch_task_planning_flow(self, mock_trigger):
        """
        Test del flujo de planificación de tarea.
        Al establecer internal_planned_date con internal_responsibles,
        el estado debe cambiar a PLANNED.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas sin planificar
        tasks = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.NOT_STARTED,
            _quantity=3,
        )

        # Obtener grupos disponibles para asignar
        available_groups = Group.objects.all()[:2]

        for task in tasks:
            url_detail = reverse("task-detail", kwargs={"pk": task.id})
            planned_date = timezone.now() + timedelta(days=5)

            # Hacer PATCH con planificación
            response = self.client.patch(
                url_detail,
                {
                    "internal_planned_date": planned_date.isoformat(),
                    "internal_responsibles": [group.id for group in available_groups],
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verificar que el estado cambió a PLANNED
            task.refresh_from_db()
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.PLANNED)
            self.assertIsNotNone(task.internal_planned_date)
            self.assertEqual(task.internal_responsibles.count(), len(available_groups))

        # Verificar que se llamó al pusher para notificar a supervisores
        self.assertGreater(mock_trigger.call_count, 0)
        # Verificar que se usó el canal y evento correcto
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        task_channel_calls = channels_called.count("task-channel")
        self.assertEqual(
            task_channel_calls,
            len(tasks),
            "Debe notificar por task-channel una vez por cada tarea actualizada",
        )

    @patch.object(PusherClient, "trigger")
    def test_patch_task_start_flow(self, mock_trigger):
        """
        Test del flujo de inicio de tarea.
        Al establecer act_start_date, el estado debe cambiar a IN_PROGRESS
        y eliminar alertas críticas.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas con alertas críticas
        tasks = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.HOLD,
            _quantity=3,
        )

        for task in tasks:
            # Crear alertas críticas
            baker.make(Alert, task=task, kind=Alert.KIND.CRITICAL, _quantity=2)

            url_detail = reverse("task-detail", kwargs={"pk": task.id})
            start_date = timezone.now()

            # Hacer PATCH con fecha de inicio
            response = self.client.patch(
                url_detail,
                {
                    "act_start_date": start_date.isoformat(),
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            # Verificar que el estado cambió a IN_PROGRESS
            task.refresh_from_db()
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.IN_PROGRESS)
            self.assertIsNotNone(task.act_start_date)

            # Verificar que se eliminaron alertas críticas
            critical_alerts = Alert.objects.filter(task=task, kind=Alert.KIND.CRITICAL)
            self.assertEqual(critical_alerts.count(), 0)

        # Verificar que se llamó al pusher para actualizar dashboard
        self.assertGreater(mock_trigger.call_count, 0)
        # Verificar que se usó el canal dashboard-channel
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        dashboard_channel_calls = channels_called.count("dashboard-channel")
        self.assertEqual(
            dashboard_channel_calls,
            len(tasks),
            "Debe notificar por dashboard-channel una vez por cada tarea actualizada",
        )
        # Verificar que se usó el canal dashboard-channel
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        self.assertIn(
            "dashboard-channel",
            channels_called,
            "Debe notificar por el canal dashboard-channel",
        )

    @patch.object(PusherClient, "trigger")
    def test_patch_task_progress_update_flow(self, mock_trigger):
        """
        Test del flujo de actualización de progreso.
        Al actualizar complete_pct (1-99), el estado debe cambiar a IN_PROGRESS
        o WARNING (si hay alertas), y establecer act_start_date si no existe.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas sin iniciar
        tasks_without_warnings = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.NOT_STARTED,
            complete_pct=0,  # The default value
            _quantity=2,
        )

        tasks_with_warnings = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.WARNING,
            complete_pct=10,
            _quantity=3,
        )
        warning_alerts_query = Alert.objects.filter(kind=Alert.KIND.WARNING)

        # Agregar alertas de advertencia y establecer act_start_date para cada tarea
        for task in tasks_with_warnings:
            task.act_start_date = timezone.now() - timedelta(days=1)
            task.save()
            baker.make(Alert, task=task, kind=Alert.KIND.WARNING)

        # Test para tareas sin advertencias
        for task in tasks_without_warnings:
            url_detail = reverse("task-detail", kwargs={"pk": task.id})
            progress_value = baker.random_gen.gen_integer(min_int=1, max_int=99)

            response = self.client.patch(
                url_detail,
                {
                    "complete_pct": progress_value,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            task.refresh_from_db()
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.IN_PROGRESS)
            self.assertEqual(task.complete_pct, progress_value)
            self.assertIsNotNone(task.act_start_date)
            self.assertIsNone(task.act_end_date)
        # Test para tareas con advertencias
        for task in tasks_with_warnings:
            # Verificar que la alerta existe antes del patch

            self.assertGreater(warning_alerts_query.filter(task=task).count(), 0)

            url_detail = reverse("task-detail", kwargs={"pk": task.id})
            progress_value = baker.random_gen.gen_integer(min_int=1, max_int=99)

            response = self.client.patch(
                url_detail,
                {
                    "complete_pct": progress_value,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            task.refresh_from_db()
            # La alerta WARNING debe seguir existiendo

            self.assertGreater(warning_alerts_query.filter(task=task).count(), 0)
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.WARNING)
            self.assertEqual(task.complete_pct, progress_value)
            self.assertIsNotNone(task.act_start_date)

        # Verificar que se llamó al pusher para actualizar dashboards
        total_tasks = len(tasks_without_warnings) + len(tasks_with_warnings)
        self.assertGreater(mock_trigger.call_count, 0)
        # Verificar notificaciones a management y dashboard
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        management_calls = channels_called.count("management-dashboard-channel")
        dashboard_calls = channels_called.count("dashboard-channel")
        # Cada actualización de progreso debe notificar tanto a management como a dashboard
        self.assertEqual(
            management_calls,
            total_tasks,
            "Debe notificar a management-dashboard-channel una vez por cada tarea",
        )
        self.assertEqual(
            dashboard_calls,
            total_tasks,
            "Debe notificar a dashboard-channel una vez por cada tarea",
        )

    @patch.object(PusherClient, "trigger")
    def test_patch_task_complete_flow_with_percentage(self, mock_trigger):
        """
        Test del flujo de completar tarea usando complete_pct=100.
        El estado debe cambiar a COMPLETED, complete_pct debe ser 100,
        y act_end_date debe establecerse automáticamente.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas en progreso
        tasks = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.IN_PROGRESS,
            complete_pct=50,
            _quantity=3,
        )

        for task in tasks:
            url_detail = reverse("task-detail", kwargs={"pk": task.id})

            response = self.client.patch(
                url_detail,
                {
                    "complete_pct": 100,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            task.refresh_from_db()
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.COMPLETED)
            self.assertEqual(task.complete_pct, 100)
            self.assertIsNotNone(task.act_end_date)

        # Verificar que se llamó al pusher para actualizar dashboards
        self.assertGreater(mock_trigger.call_count, 0)
        # Verificar notificaciones a management y dashboard
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        management_calls = channels_called.count("management-dashboard-channel")
        dashboard_calls = channels_called.count("dashboard-channel")
        # Cada completación debe notificar tanto a management como a dashboard
        self.assertEqual(
            management_calls,
            len(tasks),
            "Debe notificar a management-dashboard-channel una vez por cada tarea",
        )
        self.assertEqual(
            dashboard_calls,
            len(tasks),
            "Debe notificar a dashboard-channel una vez por cada tarea",
        )

    @patch.object(PusherClient, "trigger")
    def test_patch_task_complete_flow_with_end_date(self, mock_trigger):
        """
        Test del flujo de completar tarea usando act_end_date.
        El estado debe cambiar a COMPLETED y complete_pct debe ser 100.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas en progreso
        tasks = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.IN_PROGRESS,
            complete_pct=50,
            act_end_date=None,
            _quantity=3,
        )

        for task in tasks:
            url_detail = reverse("task-detail", kwargs={"pk": task.id})
            end_date = timezone.now()

            response = self.client.patch(
                url_detail,
                {
                    "act_end_date": end_date.isoformat(),
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_200_OK)

            task.refresh_from_db()
            self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.COMPLETED)
            self.assertEqual(task.complete_pct, 100)
            self.assertIsNotNone(task.act_end_date)

        # Verificar que se llamó al pusher para actualizar dashboards
        self.assertGreater(mock_trigger.call_count, 0)
        # Verificar notificaciones a management y dashboard
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        management_calls = channels_called.count("management-dashboard-channel")
        dashboard_calls = channels_called.count("dashboard-channel")
        # Cada completación debe notificar tanto a management como a dashboard
        self.assertEqual(
            management_calls,
            len(tasks),
            "Debe notificar a management-dashboard-channel una vez por cada tarea",
        )
        self.assertEqual(
            dashboard_calls,
            len(tasks),
            "Debe notificar a dashboard-channel una vez por cada tarea",
        )

    @patch.object(PusherClient, "trigger")
    def test_patch_completed_task_validation(self, mock_trigger):
        """
        Test que verifica que no se puede editar una tarea completada.
        Debe retornar un error de validación.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Crear tareas completadas
        tasks = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.COMPLETED,
            complete_pct=100,
            _quantity=3,
        )

        for task in tasks:
            url_detail = reverse("task-detail", kwargs={"pk": task.id})

            # Intentar actualizar el progreso
            response = self.client.patch(
                url_detail,
                {
                    "complete_pct": 50,
                },
                format="json",
            )

            self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
            self.assertIn("COMPLETED", str(response.data))

    @patch.object(PusherClient, "trigger")
    def test_patch_validation_planned_date_requires_responsibles(self, mock_trigger):
        """
        Test que verifica la validación de campos requeridos:
        - internal_planned_date requiere internal_responsibles
        - internal_responsibles requiere internal_planned_date
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        task = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.NOT_STARTED,
        )

        url_detail = reverse("task-detail", kwargs={"pk": task.id})

        # Test 1: Intentar establecer planned_date sin responsibles
        response = self.client.patch(
            url_detail,
            {
                "internal_planned_date": (
                    timezone.now() + timedelta(days=5)
                ).isoformat(),
                "internal_responsibles": [],
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Responsible Roles", str(response.data))

        # Test 2: Intentar establecer responsibles sin planned_date
        available_groups = Group.objects.all()[:1]
        response = self.client.patch(
            url_detail,
            {"internal_responsibles": [group.id for group in available_groups]},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("Planned Date", str(response.data))

    @patch.object(PusherClient, "trigger")
    def test_patch_hold_clears_internal_responsibles(self, mock_trigger):
        """
        Verifica que al cambiar el estado interno a HOLD, se limpien
        los `internal_responsibles` de la tarea y se notifique al dashboard.
        """
        self.user.is_superuser = True
        self.user.save()
        self.client.force_authenticate(user=self.user)

        # Obtener grupos para asignar responsables
        available_groups = list(Group.objects.all()[:2])
        if not available_groups:
            # Si no hay grupos en fixtures, crear uno rápido
            available_groups = [baker.make(Group)]

        # Crear tarea con responsables asignados
        task = baker.make(
            Task,
            internal_status=Task.INTERNAL_STATUS.IN_PROGRESS,
        )
        # Asignar responsables manualmente
        for g in available_groups:
            task.internal_responsibles.add(g)
        task.save()

        self.assertGreater(task.internal_responsibles.count(), 0)

        url_detail = reverse("task-detail", kwargs={"pk": task.id})

        # Cambiar estado a HOLD
        response = self.client.patch(
            url_detail,
            {"internal_status": Task.INTERNAL_STATUS.HOLD.value},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        task.refresh_from_db()
        # Los responsables deben haber sido limpiados
        self.assertEqual(task.internal_responsibles.count(), 0)
        self.assertEqual(task.internal_status, Task.INTERNAL_STATUS.HOLD)

        # Verificar que se notificó al dashboard general una vez por la actualización
        channels_called = [call_item[0][0] for call_item in mock_trigger.call_args_list]
        dashboard_calls = channels_called.count("dashboard-channel")
        management_calls = channels_called.count("management-dashboard-channel")
        self.assertEqual(dashboard_calls, 1)
        self.assertEqual(management_calls, 0)
