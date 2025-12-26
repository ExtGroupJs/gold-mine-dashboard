from django.contrib import admin
from .models.generic_log import GenericLog


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

        self.all_fields = [
            field.name for field in model._meta.get_fields(include_parents=False)
        ]
        if hasattr(self, "EXCLUDED_FIELDS_FOR_EDITING"):
            self.EXCLUDED_FIELDS.update(self.EXCLUDED_FIELDS_FOR_EDITING)

        self.editable_fields = [
            field
            for field in self.all_fields
            if field not in self.EXCLUDED_FIELDS
            and not self._is_problematic_field_for_edit(field)
        ]
        self.list_display_fields = [
            field
            for field in self.all_fields
            if not self._is_problematic_field_in_list(field)
        ]
        self.empty_value_display = "-empty-"
        self.list_display = self.list_display_fields
        self.fields = self.editable_fields

    def _is_problematic_field_in_list(self, field_name):
        """Verifica si un campo es ManyToMany o reverse ForeignKey"""
        try:
            field = self.model._meta.get_field(field_name)
            return (
                field.many_to_many
                or (field.many_to_one and field.auto_created)
                or (field.is_relation and field.auto_created)
                or (field.one_to_one and field.auto_created)
            )
        except Exception:
            return False

    def _is_problematic_field_for_edit(self, field_name):
        """Verifica si un campo es ManyToMany o reverse ForeignKey"""
        try:
            field = self.model._meta.get_field(field_name)
            return field.many_to_many
        except Exception:
            return False


@admin.register(GenericLog)
class GenericLogAdmin(GenericModelAdmin):
    pass  # Usará la configuración genérica por defecto
