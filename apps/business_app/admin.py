from django.contrib import admin
from apps.common.admin import (
    GenericModelAdmin,
)  # TODO usar este siempre que sea posible


from .models.resource import Resource
from .models.task import Task
from .models.alert import Alert
from .models.task_resource import TaskResource
from .models.wbs import WBS
from .models.primavera_import_file import PrimaveraImportFile
from .models.allowed_extensions import AllowedExtensions


@admin.register(AllowedExtensions)
class AllowedExtensionsAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto


@admin.register(Resource)
class ResourceAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto


@admin.register(Task)
class TaskAdmin(GenericModelAdmin):
    EXCLUDED_FIELDS_FOR_EDITING = {"taskresource", "alerts"}


@admin.register(Alert)
class AlertAdmin(GenericModelAdmin):
    EXCLUDED_FIELDS_FOR_EDITING = {"deleted", "deleted_by_cascade"}


@admin.register(TaskResource)
class TaskResourceAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto


@admin.register(WBS)
class WBSAdmin(GenericModelAdmin):
    EXCLUDED_FIELDS_FOR_EDITING = {"task"}


@admin.register(PrimaveraImportFile)
class PrimaveraImportFileAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto
