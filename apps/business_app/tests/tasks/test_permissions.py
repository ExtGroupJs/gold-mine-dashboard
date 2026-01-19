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
        """Configura el entorno de prueba antes de cada test.
        
        Llama al setUp de la clase padre para inicializar el estado base
        necesario para las pruebas de permisos.
        """
        super().setUp()

    @patch("apps.business_app.signals.PusherClient.trigger")
    def test_get_protocol(self, trigger_mock):
        """Verifica que los permisos de lectura funcionan correctamente con el protocolo GET.
        
        Prueba que solo los roles con acceso de lectura a tareas pueden realizar
        peticiones GET al endpoint de listado de tareas.
        
        Args:
            trigger_mock: Mock del trigger de PusherClient para evitar llamadas reales.
        """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS
        test_protocols = [self.client.get]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_put_patch_protocols(self):
        """Verifica que los permisos de escritura funcionan correctamente con PUT y PATCH.
        
        Prueba que solo los roles con acceso de escritura a tareas pueden realizar
        peticiones PUT y PATCH al endpoint de listado de tareas.
        """
        url = reverse("task-list")
        allowed_groups = ROLES_WITH_WRITE_ACCESS_TO_TASKS
        test_protocols = [self.client.put, self.client.patch]
        for protocol in test_protocols:
            self._test_permissions(
                url, allowed_roles=allowed_groups, request_using_protocol=protocol
            )

    def test_acces_to_counter(self):
        """Verifica el acceso al endpoint de contadores de tareas.
        
        Prueba que los roles con acceso de lectura a tareas y el rol PLANNER
        pueden acceder al endpoint de contadores de tareas mediante GET.
        """
        url = reverse("task-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )

    def test_acces_to_management_counters(self):
        """Verifica el acceso al endpoint de contadores de gestión de tareas.
        
        Prueba que los roles con acceso de lectura a tareas y el rol PLANNER
        pueden acceder al endpoint de contadores de gestión mediante GET.
        """
        url = reverse("task-management-counters")
        allowed_groups = ROLES_WITH_READ_ACCESS_TO_TASKS + (Groups.PLANNER,)

        self._test_permissions(
            url,
            allowed_roles=allowed_groups,
            request_using_protocol=self.client.get,
        )
