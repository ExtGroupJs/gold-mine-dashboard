import logging
import pusher
from django.conf import settings

logger = logging.getLogger(__name__)


class PusherClient:
    """Wrapper around pusher.Pusher that logs triggers for debugging."""

    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            # underlying pusher client
            cls._instance._client = pusher.Pusher(
                app_id=settings.PUSHER_APP_ID,
                key=settings.PUSHER_KEY,
                secret=settings.PUSHER_SECRET,
                cluster=settings.PUSHER_CLUSTER,
                ssl=True,
            )
        return cls._instance

    def trigger(self, channel, event, data):
        try:
            logger.debug(
                "Pusher trigger -> channel=%s event=%s data=%s", channel, event, data
            )
            return self._client.trigger(channel, event, data)
        except Exception:
            logger.exception(
                "Error triggering pusher event %s on channel %s", event, channel
            )
            raise
