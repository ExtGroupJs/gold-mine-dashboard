from django.contrib import admin
from solo.admin import SingletonModelAdmin
import logging
from django.contrib import admin
from apps.common.admin import GenericModelAdmin # TODO usar este siempre que sea posible


from .models.resource import Resource
from .models.task import Task
from .models.task_resource import TaskResource
from .models.wbs import WBS


@admin.register(Resource)
class ResourceAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto

@admin.register(Task)
class TaskAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto

@admin.register(TaskResource)
class ResourceAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto

@admin.register(WBS)
class WBSAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto
