from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters, viewsets, permissions
from rest_framework.generics import GenericAPIView

from apps.common.permissions import ShopProductsViewSetPermission


from ..models.task import Task
from ..serializers.task import TaskSerializer
from apps.common.mixins.common_view_mixin import CommonOrderingFilter


# Create your views here.


class TaskViewSet(viewsets.ModelViewSet, GenericAPIView):
    """ """

    queryset = Task.objects.all()
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
    permission_classes = [permissions.AllowAny]
