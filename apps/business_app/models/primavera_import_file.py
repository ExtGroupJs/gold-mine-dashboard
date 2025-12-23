from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils.deconstruct import deconstructible
from .allowed_extensions import AllowedExtensions
import os
from django.core.exceptions import ValidationError



@deconstructible
class FileExtensionValidator:
    def __call__(self, value):
        extensions = AllowedExtensions.objects.values_list("extension", flat=True)
        ext = os.path.splitext(value.name)[1]
        if ext.lower() not in extensions:
            raise ValidationError(f"File type '{ext}' is not supported.")



class PrimaveraImportFile(models.Model):
    file = models.FileField(upload_to='primavera_imports/', validators=[FileExtensionValidator()],)
    created_at = models.DateTimeField(auto_now_add=True)
    extra_info = models.TextField(blank=True, null=True)
    system_user = models.ForeignKey(
        "users_app.SystemUser",
        on_delete=models.CASCADE,
        related_name="uploaded_files",
    )
    class Meta:
        verbose_name = _("Primavera imported File")
        verbose_name_plural = _("Primavera imported Files")

    def __str__(self):
        return self.file.name

    # def save(self, *args, **kwargs):
    #     original_file = self.original_file
    #     is_new = self.pk is None
    #     file_name, extension = os.path.splitext(original_file.name)
    #     super().save(*args, **kwargs)  # Call the "real" save() method.
    #     if (
    #         extension == ".pdb"
    #         or InitialFileData.objects.filter(uploaded_file_id=self.pk).exists()
    #     ):
    #         return

    #     elif is_new and original_file:
    #         try:
    #             global_configuration = SiteConfiguration.get_solo()

    #             processor_classes = [XslxToPdb, XslxToPdbGraph]
    #             for processor_class in processor_classes:
    #                 processor_object = processor_class(
    #                     original_file, global_configuration
    #                 )
    #                 # Process the file and get the processed content
    #                 if global_configuration.upload_to_drive or isinstance(
    #                     processor_object, XslxToPdbGraph
    #                 ):
    #                     processor_object.proccess_initial_file_data(self.id)
    #                 processor_object.proccess_pdb_file(self.id, file_name)
    #                 # if isinstance(processor_object, XslxToPdb):
    #                 #     # Upload the file to Google Drive
    #                 #     processor = UploadToGoogleDriveApi()
    #                 #     sheet_id = processor.upload_file_to_google_drive(
    #                 #         original_file.path
    #                 #     )
    #                 #     print(sheet_id)
    #                 #     self.google_sheet_id = sheet_id
    #                 #     self.save(force_update=True, update_fields=["google_sheet_id"])

    #         except Exception as e:
    #             print(e)
    #             self.delete()
    #             raise e
    #     if self.predefined:
    #         UploadedFiles.objects.filter(gene=self.gene).exclude(id=self.id).update(
    #             predefined=False
    #         )

    # def delete(self, *args, **kwargs):
    #     # Delete the physical file before deleting the record
    #     self.delete_physical_file(self.original_file)
    #     if self.google_sheet_id:
    #         processor = UploadToGoogleDriveApi()
    #         processor.delete_file_from_google_drive(self.google_sheet_id)
    #     cache.delete(
    #         UploadedFiles.CACHE_KEY_RELATED_ALLELE_NODES.format(
    #             uploaded_file_id=self.id
    #         )
    #     )
    #     super().delete(*args, **kwargs)

    # def delete_physical_file(self, file_field):
    #     if file_field:
    #         file_path = file_field.path
    #         if os.path.exists(file_path):
    #             os.remove(file_path)
