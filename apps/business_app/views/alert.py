from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.generics import GenericAPIView



from ..models.alert import Alert
from ..serializers.alert import AlertSerializer
from apps.common.mixins.common_view_mixin import CommonOrderingFilter


# Create your views here.
from apps.common.permissions import IsAuthenticatedAndReadOnly


class AlertViewSet(viewsets.ModelViewSet, GenericAPIView):
    """ """

    queryset = (
        Alert.objects.all().select_related("task").prefetch_related("task__resources")
    )
    serializer_class = AlertSerializer
    search_fields = [
        "task__task_code",
        "task__task_name",
        "task__wbs__wbs_id",
        "task__resources__name",
    ]
    ordering_fields = "__all__"
    permission_classes = [IsAuthenticatedAndReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    filterset_fields = {
        "kind": ["exact", "in"],
        "task__wbs__id": ["exact", "in"],
        "task__resources__id": ["exact", "in"],
    }
