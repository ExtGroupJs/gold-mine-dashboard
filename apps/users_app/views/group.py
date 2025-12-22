import logging

from rest_framework import permissions, viewsets
from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from django.contrib.auth.models import Group
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.generics import GenericAPIView


from apps.users_app.serializers import GroupSerializer

logger = logging.getLogger(__name__)

# Create your views here.


class GroupViewSet(viewsets.ModelViewSet, GenericAPIView):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = Group.objects.all().prefetch_related("user_set")
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
