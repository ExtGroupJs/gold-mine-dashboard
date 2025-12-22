# from rest_framework import routers
from rest_framework_extensions.routers import ExtendedSimpleRouter

# from django.urls import path

router = ExtendedSimpleRouter()

# router.register(
#     "url",
#     ViewSet,
#     basename="basename",
# )

urlpatterns = [
    # path("layers/", list_layers, name="list_layers"),
]

urlpatterns += router.urls
