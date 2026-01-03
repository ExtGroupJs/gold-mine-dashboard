# from rest_framework import routers
from rest_framework_extensions.routers import ExtendedSimpleRouter
from .views.task import TaskViewSet, TaskEnumsViewSet
from .views.alert import AlertViewSet, AlertEnumsViewSet
from .views.excel_exporter import ExcelExporterViewSet

# from django.urls import path

router = ExtendedSimpleRouter()

router.register(
    "task",
    TaskViewSet,
    basename="task",
)
router.register(
    "task-enums",
    TaskEnumsViewSet,
    basename="task-enums",
)
router.register(
    "alert",
    AlertViewSet,
    basename="alert",
)
router.register(
    "alert-enums",
    AlertEnumsViewSet,
    basename="alert-enums",
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
