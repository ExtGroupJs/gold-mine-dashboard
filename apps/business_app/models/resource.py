from django.db import models

class Resource(models.Model):
    name = models.CharField(max_length=100)
    resource_type = models.CharField(max_length=50)
    # cost_per_hour = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return self.name