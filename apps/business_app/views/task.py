from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.response import Response
from rest_framework.generics import GenericAPIView

from drf_spectacular.utils import extend_schema
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from rest_framework import permissions


from ..models.task import Task
from ..serializers.task import TaskSerializer
from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from apps.users_app.models.groups import Groups
from ..utils.counters import get_task_counters, get_daily_work_summary_for_test
from apps.common.mixins.enums_mixin import EnumsMixin


# Create your views here.


class TaskViewSet(viewsets.ModelViewSet, GenericAPIView):
    """ """

    queryset = (
        Task.objects.all().select_related("wbs").prefetch_related("resources", "alerts")
    )
    queryset = (
        Task.objects.all().select_related("wbs").prefetch_related("resources", "alerts")
    )
    serializer_class = TaskSerializer
    search_fields = [
        "task_code",
        "task_name",
        "wbs__wbs_id",
        "wbs__wbs_name",
    ]
    ordering_fields = "__all__"
    # permission_classes = [ShopProductsViewSetPermission]
    permission_classes = [permissions.AllowAny]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    filterset_fields = {
        "internal_status": ["exact", "in"],
        "wbs__id": ["exact", "in"],
        "internal_responsibles__id": ["exact", "in"],
        "internal_planned_date": ["exact", "lt", "gt", "lte", "gte"],
        "act_start_date": ["exact", "lt", "gt", "lte", "gte"],
        "act_end_date": ["exact", "lt", "gt", "lte", "gte"],
        "alerts__kind": ["exact", "in"],
    }

    def get_queryset(self):
        queryset = super().get_queryset()
        request_user = self.request.user if not self.request.user.is_anonymous else None
        if request_user and (
            request_user.groups.filter(
                id__in=(Groups.PLANNER.value, Groups.DASHBOARD_CLIENT.value)
            ).exists()
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
        description=_("Get summary for management"),
    )
    @action(detail=False, methods=["GET"])
    def management_counters(self, pk=None):
        return Response(get_daily_work_summary_for_test())

    @extend_schema(
        request=None,
        methods=["GET"],
        description=_("Get tasks in every state"),
    )
    @action(detail=False, methods=["GET"])
    def counters(self, pk=None):
        return Response(get_task_counters())


class TaskEnumsViewSet(EnumsMixin):
    items = (("internal_status", Task.INTERNAL_STATUS),)
