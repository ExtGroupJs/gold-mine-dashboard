from unittest import TestCase

from django.utils import timezone
from model_bakery import baker
from oauth2_provider.models import AccessToken, Application
from rest_framework.test import APIClient
from django.core.management import call_command
from faker import Faker
from rest_framework import status
from apps.users_app.models.groups import Groups


from django.contrib.auth.models import User


class BaseTestClass(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.faker = Faker(0)
        if hasattr(self, "fixtures"):
            call_command(
                "loaddata",
                *self.fixtures,
                **{"verbosity": 0},
            )

        self.user = baker.make(User, _fill_optional=True)  # User.objects.create_user(

        self.oauth2_app = baker.make(
            Application,
            redirect_uris="redirect_uri.com",
            client_type=Application.CLIENT_CONFIDENTIAL,
            authorization_grant_type=Application.GRANT_AUTHORIZATION_CODE,
            name="Test App",
        )
        self.oauth2_token = baker.make(
            AccessToken,
            user_id=self.user.id,
            token="test_gen_token",
            application_id=self.oauth2_app.id,
            expires=timezone.now() + timezone.timedelta(days=1),
            scope="read,write",
        )

    def _test_permissions(
        self,
        url,
        allowed_roles,
        request_using_protocol,
        expected_status=status.HTTP_403_FORBIDDEN,
    ):
        """
        Función genérica para comprobar los permisos sobre determinado EP para un grupo de Roles
        Ejemplo de uso. En cualquier clase que herede de BaseTestClass:
        self._test_permissions(
            url,
            allowed_roles=allowed_groups, # esto es un listado de roles
            protocol=self.client.post # puede ser cualquiera de los protocolos
        )
        """
        # self.client.force_authenticate(self.user, self.oauth2_token)
        self.user.is_superuser = False
        self.user.is_staff = False

        # User is not authenticated, so has no permissions to access the endpoint.
        self.assertEqual(
            request_using_protocol(url, format="json").status_code,
            expected_status,
            msg=f"When calling EP <{url}> with NO AUTHENTICATION: "
            f"<{expected_status}> was expected, <{request_using_protocol(url, format='json').status_code}> was received",
        )
        self.client.force_authenticate(self.user)

        # User has no role, so has no permissions to access the endpoint.
        self.assertEqual(
            request_using_protocol(url, format="json").status_code,
            expected_status,
            msg=f"When calling EP <{url}> with NO ROLE: "
            f"<{expected_status}> was expected, <{request_using_protocol(url, format='json').status_code}> was received",
        )
        for role in allowed_roles:
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(role)
            self.assertNotEqual(
                request_using_protocol(url, format="json").status_code,
                expected_status,
                msg=f"When calling EP <{url}> with ALLOWED ROLE: "
                f"'{role.label}', a value different than <{expected_status}> was expected.",
            )

        for group in self._get_not_allowed_groups(allowed_roles):
            self.user.groups.clear()  # Remove the group to avoid side effects in other tests.
            self.user.groups.add(group.value)
            self.assertEqual(
                request_using_protocol(url, format="json").status_code,
                expected_status,
                msg=f"When calling EP <{url}> with NON ALLOWED ROLE: "
                f"'{group.label}', <{expected_status}> was expected, <{request_using_protocol(url, format='json').status_code}> was received",
            )

    def _get_not_allowed_groups(self, allowed_groups):
        return [group for group in Groups if group not in allowed_groups]
