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

    @extend_schema(
        request=None,
        methods=["GET"],
        description=_("Get tasks in every state"),
    )
    @action(detail=False, methods=["GET"])
    def counters(self, pk=None):
        resp = {}
        for status in Task.INTERNAL_STATUS:  # status es un miembro del enum
            resp[str(status.label)] = Task.objects.filter(
                internal_status=status
            ).count()
        resp["total"] = Task.objects.all().count()
        resp[""]
        return Response(resp)
