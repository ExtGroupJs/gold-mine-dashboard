import logging
import random

from django.contrib.auth import login, logout
from django.core.mail import send_mail
from django.utils.translation import gettext_lazy as _
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema
from rest_framework import filters, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.generics import GenericAPIView
from rest_framework.response import Response

from apps.common.mixins.common_view_mixin import CommonOrderingFilter
from apps.users_app.models.system_user import SystemUser
from apps.users_app.serializers import LoginSerializer, UserSerializer

logger = logging.getLogger(__name__)


# Create your views here.


class UserViewSet(viewsets.ModelViewSet, GenericAPIView):
    """
    API endpoint that allows users to be viewed or edited.
    """

    queryset = (
        SystemUser.objects.exclude(username="admin")
        # .select_related("user_ptr", "country")
    )
    serializer_class = UserSerializer
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
    filterset_fields = [
        "username",
    ]
    search_fields = [
        "username",
        "email",
        "first_name",
        "last_name",
    ]
    ordering = ["username"]
    ordering_fields = "__all__"

    # permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_permissions(self):
        if self.action in ["login", "create"]:
            permission_classes = [permissions.AllowAny]

        else:
            permission_classes = [permissions.IsAuthenticated]
        return [permission() for permission in permission_classes]

    @extend_schema(
        request=UserSerializer,
        methods=["POST"],
        description=_("Creates an user"),
        responses={201: UserSerializer},
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        # confirmation_code = self._get_confirmation_code(
        #     serializer.validated_data["email"]
        # )
        # if not confirmation_code:
        #     return Response(
        #         _("Error sending confirmation code, user was not created"),
        #         status=status.HTTP_406_NOT_ACCEPTABLE,
        #     )

        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        response_data = serializer.data
        # response_data["confirmation_code"] = confirmation_code
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def _get_confirmation_code(self, email):
        confirmation_code = f"{random.randint(100000, 999999)}"
        try:
            send_mail(
                subject=_('Successfull registration on "Allele Viewer"'),
                message=_(
                    f"You have successfully registered on our system. For confirmation, please enter the following code when requested: {confirmation_code}"
                ),
                from_email=None,
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            logger.error(f"{str(e)}")
            return None

        return confirmation_code

    @extend_schema(
        request=LoginSerializer,
        methods=["POST"],
        description=_("Provides authentication using user and password combination"),
        responses={202: UserSerializer},
    )
    @action(detail=False, methods=["POST"])
    def login(self, request):
        serializer = LoginSerializer(
            data=self.request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        serializer = UserSerializer(user.systemuser)
        return Response(serializer.data, status=status.HTTP_202_ACCEPTED)

    @extend_schema(
        request=None,
        methods=["GET"],
        description=_("Logout user"),
        responses={202: None},
    )
    @action(detail=False, methods=["GET"])
    def logout(self, request):
        logout(request)
        return Response(
            _("Successfully logged out user"), status=status.HTTP_202_ACCEPTED
        )
