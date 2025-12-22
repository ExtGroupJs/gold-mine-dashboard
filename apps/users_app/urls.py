from rest_framework import routers

from apps.users_app.views import UserViewSet

router = routers.DefaultRouter()
router.register(r"users", UserViewSet, basename="users")
# router.register(r"countries", CountryViewSet, basename="countries")

urlpatterns = []

urlpatterns += router.urls
