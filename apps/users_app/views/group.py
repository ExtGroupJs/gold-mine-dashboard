import logging

from rest_framework import permissions, viewsets
from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from django.contrib.auth.models import Group
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.generics import GenericAPIView
from apps.users_app.models.groups import Groups
from rest_framework.decorators import action


from apps.users_app.serializers.group import GroupSerializer

logger = logging.getLogger(__name__)

# Create your views here.


class GroupViewSet(viewsets.ReadOnlyModelViewSet, GenericAPIView):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Group.objects.exclude(id=Groups.SUPER_ADMIN.value).prefetch_related(
        "user_set"
    )
    serializer_class = GroupSerializer

    search_fields = [
        "name",
    ]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    ordering = ["name"]

    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        queryset = self.queryset
        if self.action == "roles_for_tasks":
            queryset = queryset.filter(id__gte=Groups.SUPERVISOR_AREA_A.value)
        return queryset

    @action(
        detail=False,
        methods=["GET"],
        url_name="roles-for-tasks",
        url_path="roles-for-tasks",
    )
    def roles_for_tasks(self, request):
        return self.list(request)
