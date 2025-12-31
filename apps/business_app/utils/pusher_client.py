import pusher
from django.conf import settings


class PusherClient:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = pusher.Pusher(
                app_id=settings.PUSHER_APP_ID,
                key=settings.PUSHER_KEY,
                secret=settings.PUSHER_SECRET,
                cluster=settings.PUSHER_CLUSTER,
                ssl=True,
            )
        return cls._instance
