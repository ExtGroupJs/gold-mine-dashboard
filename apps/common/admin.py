from django.contrib import admin
from .models.generic_log import GenericLog
from django.db import models


class GenericModelAdmin(admin.ModelAdmin):
    """
    Una clase base de Django admin.ModelAdmin genérica que automatiza la configuración
    de campos para cualquier modelo, excluyendo campos comunes no editables por defecto.

    Esta clase proporciona una configuración automática para:
    - Mostrar todos los campos en la lista de administración
    - Excluir campos no editables de los formularios
    - Configurar valores por defecto para la visualización

    Atributos de clase:
        EXCLUDED_FIELDS (set): Campos que se excluirán por defecto de los formularios
            de edición. Por defecto: {"id", "created_at", "updated_at"}

    Ejemplo de uso básico:
        ```python
        from django.contrib import admin
        from apps.common.admin import GenericModelAdmin
        from .models import Product

        @admin.register(Product)
        class ProductAdmin(GenericModelAdmin):
            pass  # Usará la configuración genérica por defecto

        ```

    Personalización de campos excluidos:
        ```python
        @admin.register(Customer)
        class CustomerAdmin(GenericModelAdmin):
            # Excluye campos adicionales específicos para este modelo
            EXCLUDED_FIELDS_FOR_EDITING = {"user", "last_login"}

            # Opcional: Sobreescribe completamente los campos excluidos
            # EXCLUDED_FIELDS = {"id", "created_at", "updated_at", "status"}
        ```

    Características:
        - `list_display`: Muestra todos los campos del modelo
        - `fields`: Muestra todos los campos excepto los excluidos
        - `empty_value_display`: Muestra "-empty-" para valores nulos
        - Soporte para herencia y personalización por modelo

    Notas:
        - Los campos excluidos se combinan: EXCLUDED_FIELDS + EXCLUDED_FIELDS_FOR_EDITING
        - Los campos de relación (ForeignKey, ManyToMany) se incluyen automáticamente
        - La clase es segura para usar con cualquier modelo de Django
    """

    EXCLUDED_FIELDS = {"id", "created_at", "updated_at"}

    def __init__(self, model, admin_site):
        super().__init__(model, admin_site)

        # Obtener todos los campos una sola vez
        self.all_fields = [
            field.name for field in model._meta.get_fields(include_parents=False)
        ]

        # Actualizar campos excluidos si existen
        if hasattr(self, "EXCLUDED_FIELDS_FOR_EDITING"):
            self.EXCLUDED_FIELDS.update(self.EXCLUDED_FIELDS_FOR_EDITING)

        # Pre-calcular información de campos para evitar búsquedas repetidas
        self._field_info = {}
        for field_name in self.all_fields:
            try:
                field = model._meta.get_field(field_name)
                self._field_info[field_name] = {
                    "is_reverse": field.auto_created
                    and (
                        field.many_to_many
                        or field.one_to_many
                        or (field.one_to_one and field.auto_created)
                    ),
                    "is_m2m": field.many_to_many,
                    "is_problematic_for_list": (
                        field.many_to_many
                        or (field.many_to_one and field.auto_created)
                        or (field.is_relation and field.auto_created)
                        or (field.one_to_one and field.auto_created)
                    ),
                    "is_problematic_for_edit": field.many_to_many,
                    "is_char_field": isinstance(field, models.CharField),
                    "is_filterable": isinstance(
                        field,
                        (
                            models.BooleanField,
                            models.DateField,
                            models.DateTimeField,
                            models.IntegerField,
                            models.ForeignKey,
                            models.ManyToManyField,
                        ),
                    )
                    and not field.primary_key,
                }
            except models.FieldDoesNotExist:
                self._field_info[field_name] = {
                    "is_reverse": False,
                    "is_m2m": False,
                    "is_problematic_for_list": False,
                    "is_problematic_for_edit": False,
                    "is_char_field": False,
                    "is_filterable": False,
                }

        # Calcular campos editables
        self.editable_fields = [
            field
            for field in self.all_fields
            if field not in self.EXCLUDED_FIELDS
            and not self._field_info[field]["is_problematic_for_edit"]
            and not self._field_info[field]["is_reverse"]
        ]

        # Calcular campos para listado
        self.list_display_fields = [
            field
            for field in self.all_fields
            if not self._field_info[field]["is_problematic_for_list"]
            and not self._field_info[field]["is_reverse"]
        ]

        # Configurar atributos del admin
        self.empty_value_display = "-empty-"
        self.list_display = self.list_display_fields
        self.fields = self.editable_fields
        self.raw_id_fields = [
            field
            for field in self.all_fields
            if self._field_info[field]["is_m2m"]
            and not self._field_info[field]["is_reverse"]
        ]
        self.search_fields = [
            field
            for field in self.all_fields
            if self._field_info[field]["is_char_field"]
        ]
        self.list_select_related = True
        self.list_filter = [
            field
            for field in self.all_fields
            if self._field_info[field]["is_filterable"]
        ]

    def _is_reverse_relationship(self, field_name):
        """Verifica si un campo es una relación inversa"""
        return self._field_info[field_name]["is_reverse"]


@admin.register(GenericLog)
class GenericLogAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto
