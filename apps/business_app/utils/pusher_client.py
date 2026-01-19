import logging
import pusher
from django.conf import settings

logger = logging.getLogger(__name__)


class PusherClient:
    """Wrapper around pusher.Pusher that logs triggers for debugging."""

    # CHANNELS
    MANAGEMENT_DASHBOARD_CHANNEL = "management-dashboard-channel"
    DASHBOARD_CHANNEL = "dashboard-channel"
    TASK_CHANNEL = "task-channel"
    ALERT_CHANNEL = "alert-channel"

    # EVENTS
    UPDATE_TASK_EVENT = "update-task-event"
    UPDATE_TASK_EVENT_FOR_SUPERVISOR = "update-task-event-for-supervisor"
    UPDATE_ALERT_EVENT = "update-alert-event"

    NEW_ALERT_EVENT = "new-alert-event"
    DELETED_ALERT_EVENT = "deleted-alert-event"

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
                timeout=30,
            )
        return cls._instance

    def trigger(self, channel, event, data):
        try:
            print(f"Pusher trigger -> channel={channel} event={event} data={data}")
            return self._client.trigger(channel, event, data)
        except Exception as e:
            logger.exception(
                f"Error triggering pusher event {event} on channel {channel}",
                exc_info=e,
            )
            raise
