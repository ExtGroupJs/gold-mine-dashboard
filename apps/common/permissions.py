from rest_framework.permissions import (
    SAFE_METHODS,
    BasePermission,
    DjangoModelPermissions,
)

from apps.users_app.models.groups import Groups

COMMON_ROLES = [
    Groups.SUPER_ADMIN.value,
]


class CommonRolePermission(DjangoModelPermissions):
    """
    Common permissions class

    include checks for:
    - user is authenticated
    - user is superuser
    - user is in X roles

    usage:

    class FooPerm(CommonRolePermission)
        roles = COMMON_ROLES + [new_role, ]
        superuser_bypass = True  # if you need to enable/disable the superuser full permissions

        # if extra logic needed
        def has_permission(self, request, view):
            # only users with `name` starting with `foo` and common roles
            return bool(
                super.has_permission(request, view)
                and request.user.name.startswith('foo')
            )

    """

    roles = COMMON_ROLES
    superuser_bypass = True

    def get_superuser_bypass(self, request, view=None, obj=None):
        """
        Return if a permission should be bypassed by superusers
        """
        return self.superuser_bypass

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if (
            self.get_superuser_bypass(request=request, view=view)
            and request.user.is_superuser
        ):
            return True

        roles = self.get_roles(request)
        return request.user.groups and request.user.groups.filter(id__in=roles).exists()

    def get_roles(self, request):
        return self.roles


class IsAuthenticatedAndReadOnly(BasePermission):
    """
    The request is authenticated as a user and is a read-only request.
    """

    def has_permission(self, request, view):
        return bool(
            request.method in SAFE_METHODS
            and request.user
            and request.user.is_authenticated
        )


# class UssageExamplePermission(CommonRolePermission):
#     roles = (
#         Groups.SOME_ROLE.value,
#         Groups.SOME_OTHER_ROLE.value,
#     )
