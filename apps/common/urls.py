from rest_framework import routers

from apps.common.views.generic_log import GenericLogViewSet


router = routers.DefaultRouter()
router.register(r"logs", GenericLogViewSet, basename="logs")

urlpatterns = []

urlpatterns += router.urls
