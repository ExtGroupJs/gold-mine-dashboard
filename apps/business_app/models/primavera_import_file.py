from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.deconstruct import deconstructible
from .allowed_extensions import AllowedExtensions
import os
from django.core.exceptions import ValidationError
from apps.users_app.models.system_user import SystemUser


@deconstructible
class FileExtensionValidator:
    def __call__(self, value):
        extensions = AllowedExtensions.objects.values_list("extension", flat=True)
        ext = os.path.splitext(value.name)[1]
        if ext.lower() not in extensions:
            raise ValidationError(f"File type '{ext}' is not supported.")


class PrimaveraImportFile(models.Model):
    file = models.FileField(
        upload_to="primavera_imports/",
        validators=[FileExtensionValidator()],
    )
    created_at = models.DateTimeField(auto_now_add=True)
    extra_info = models.TextField(blank=True, null=True)
    system_user = models.ForeignKey(
        SystemUser,
        on_delete=models.CASCADE,
        related_name="uploaded_files",
    )

    class Meta:
        verbose_name = _("Primavera imported File")
        verbose_name_plural = _("Primavera imported Files")

    def __str__(self):
        return self.file.name

    def delete(self, *args, **kwargs):
        # Delete the physical file before deleting the record
        self.delete_physical_file(self.file)
        super().delete(*args, **kwargs)

    def delete_physical_file(self, file_field):
        if file_field:
            file_path = file_field.path
            if os.path.exists(file_path):
                os.remove(file_path)

    def save(self, *args, **kwargs):
        file = self.file
        is_new = self.pk is None
        file_name, extension = os.path.splitext(file.name)
        super().save(*args, **kwargs)  # Call the "real" save() method.

        if is_new and file:
            try:
                global_configuration = SiteConfiguration.get_solo()
                processor_object = XslxToPdb(file, global_configuration)
                processor_object.proccess_initial_file_data(self.id)
                processor_object.proccess_pdb_file(self.id, file_name)
            except Exception as e:
                print(e)
                self.delete()
                raise e

