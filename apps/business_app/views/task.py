from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView

from apps.common.permissions import ShopProductsViewSetPermission
from drf_spectacular.utils import extend_schema
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action


from ..models.task import Task
from ..serializers.task import TaskSerializer
from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from apps.users_app.models.groups import Groups
from ..utils.task_counters import get_task_counters


# Create your views here.


class TaskViewSet(viewsets.ModelViewSet, GenericAPIView):
    """ """

    queryset = (
        Task.objects.all().select_related("wbs").prefetch_related("resources", "alerts")
    )
    serializer_class = TaskSerializer
    search_fields = [
        "task_code",
        "task_name",
        "wbs__wbs_id",
    ]
    ordering_fields = "__all__"
    permission_classes = [ShopProductsViewSetPermission]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]

    def get_queryset(self):
        queryset = super().get_queryset()
        request_user = self.request.user if not self.request.user.is_anonymous else None
        if request_user and (
            request_user.groups.filter(id=Groups.PLANNER.value).exists()
            or request_user.is_superuser
        ):
            return queryset
        else:
            return queryset.filter(
                internal_responsibles__in=request_user.groups.all()
            ).all()

    @extend_schema(
        request=None,
        methods=["GET"],
        description=_("Get tasks in every state"),
    )
    @action(detail=False, methods=["GET"])
    def counters(self, pk=None):
        return Response(get_task_counters())
