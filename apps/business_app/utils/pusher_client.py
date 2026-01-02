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
                ssl_verify=True,
                request_timeout=30,
            )
        return cls._instance

    def trigger(self, channel, event, data):
        try:
            logger.debug(
                "Pusher trigger -> channel=%s event=%s data=%s", channel, event, data
            )
            return self._client.trigger(channel, event, data)
        except Exception as e:
            logger.exception(
                f"Error triggering pusher event {event} on channel {channel}", exc_info=e
            )
            raise
