from django.db import models
import pusher
from django.conf import settings


class WBS(models.Model):
    wbs_id = models.CharField(max_length=100, unique=True)
    wbs_name = models.CharField(max_length=250, unique=True)
    description = models.TextField(null=True, blank=True)
    class Meta:
        verbose_name = "Work Breakdown Structure (WBS)"
        verbose_name_plural = "Work Breakdown Structures (WBSs)"

    def __str__(self):
        return self.wbs_name

    def save(self, *args, **kwargs):
        pusher_client = pusher.Pusher(
            app_id=settings.PUSHER_APP_ID,
            key=settings.PUSHER_KEY,
            secret=settings.PUSHER_SECRET,
            cluster=settings.PUSHER_CLUSTER,
            ssl=True,
        )

        pusher_client.trigger("my-channel", "my-event", {"message": "hello world"})
        # Custom save logic can be added here
        super().save(*args, **kwargs)
