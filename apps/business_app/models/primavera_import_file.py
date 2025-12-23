from django.db import models

class PrimaveraImportFile(models.Model):
    file = models.FileField(upload_to='primavera_imports/')
    imported_at = models.DateTimeField(auto_now_add=True)
    extra_info = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.file.name