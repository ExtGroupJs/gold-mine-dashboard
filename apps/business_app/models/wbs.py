from django.db import models
import pusher
from django.conf import settings


class WBS(models.Model):
    wbs_id = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.wbs_id

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
