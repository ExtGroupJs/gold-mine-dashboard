# from rest_framework import routers
from rest_framework_extensions.routers import ExtendedSimpleRouter
from .views.task import TaskViewSet
from .views.alert import AlertViewSet
from .views.excel_exporter import ExcelExporterViewSet

# from django.urls import path

router = ExtendedSimpleRouter()

router.register(
    "task",
    TaskViewSet,
    basename="task",
)
router.register(
    "alert",
    AlertViewSet,
    basename="alert",
)

router.register(
    "excel-export",
    ExcelExporterViewSet,
    basename="excel-export",
)

urlpatterns = [
    # path("layers/", list_layers, name="list_layers"),
]

urlpatterns += router.urls
