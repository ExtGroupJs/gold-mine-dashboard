from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.generics import GenericAPIView
from rest_framework import permissions

from ..models.alert import Alert
from ..models.task import Task
from ..serializers.alert import AlertSerializer
from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from rest_framework.response import Response
from rest_framework import status

from drf_spectacular.utils import extend_schema
from django.utils.translation import gettext_lazy as _
from rest_framework.decorators import action
from ..utils.counters import get_alert_counters
# Create your views here.


class AlertViewSet(viewsets.ModelViewSet, GenericAPIView):
    """ """

    queryset = Alert.objects.all().select_related("task")
    serializer_class = AlertSerializer
    search_fields = [
        "task__task_code",
        "task__task_name",
        "task__wbs__wbs_id",
        "task__resources__name",
    ]
    ordering_fields = "__all__"
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    filterset_fields = {
        "kind": ["exact", "in"],
        "task": ["exact", "in"],
        "task__internal_status": ["exact", "in"],
        "task__internal_responsibles__id": ["exact", "in"],
        "task__wbs__id": ["exact", "in"],
        "task__resources__id": ["exact", "in"],
    }

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        task = instance.task
        self.perform_destroy(instance)
        if Alert.objects.filter(task=task, kind=Alert.KIND.CRITICAL).exists():
            task.internal_status = Task.INTERNAL_STATUS.HOLD
        else:
            task.internal_status = Task.INTERNAL_STATUS.IN_PROGRESS
        task.save(update_fields=["internal_status"])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @extend_schema(
        request=None,
        methods=["GET"],
        description=_("Get tasks in every state"),
    )
    @action(detail=False, methods=["GET"])
    def counters(self, pk=None):
        return Response(get_alert_counters())
