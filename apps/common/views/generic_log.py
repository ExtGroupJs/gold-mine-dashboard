from rest_framework import status
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets
from rest_framework.generics import GenericAPIView

from apps.common.common_ordering_filter import CommonOrderingFilter
from apps.common.models.generic_log import GenericLog
from apps.common.pagination import AllResultsSetPagination
from apps.common.permissions import IsAuthenticatedAndReadOnly
from apps.common.serializers.generic_log import GenericLogSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.contenttypes.models import ContentType


class GenericLogViewSet(viewsets.ReadOnlyModelViewSet, GenericAPIView):
    queryset = GenericLog.objects.all()
    serializer_class = GenericLogSerializer
    permission_classes = [IsAuthenticatedAndReadOnly]
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    pagination_class = AllResultsSetPagination
    filterset_fields = {
        "content_type": ["exact"],
        "object_id": ["exact"],
        "performed_action": ["exact"],
    }
    search_fields = [
        "name",
        "description",
    ]
    ordering = [
        "-created_timestamp",
    ]

    ordering_fields = [
        "created_timestamp",
        "performed_action",
    ]

    @action(detail=False, methods=["GET"])
    def content_types_dict(self, request):
        content_types = (
            self.get_queryset().values_list("content_type", flat=True).distinct()
        )
        result = {}
        for content_type in content_types:
            result[content_type] = ContentType.objects.get(id=content_type).name

        return Response(result, status=status.HTTP_200_OK)
