# from rest_framework import routers
from rest_framework_extensions.routers import ExtendedSimpleRouter
from .views.task import TaskViewSet

# from django.urls import path

router = ExtendedSimpleRouter()

router.register(
    "task",
    TaskViewSet,
    basename="task",
)

urlpatterns = [
    # path("layers/", list_layers, name="list_layers"),
]

urlpatterns += router.urls
