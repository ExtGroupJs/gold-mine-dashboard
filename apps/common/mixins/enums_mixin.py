from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from rest_framework import mixins
from rest_framework.response import Response
from rest_framework.viewsets import ViewSet


class EnumsMixin(mixins.ListModelMixin, ViewSet):
    pagination_class = None
    search_fields = None
    items = NotImplemented

    @method_decorator(cache_page(60 * 60))
    def list(self, request, *args, **kwargs):
        results = dict(
            (
                (
                    key,
                    [{"name": label, "id": value} for value, label in enum.choices],
                )
                for key, enum in self.items
            )
        )
        return Response(results)


# Ejemplo de uso:
# class EnumsViewSet(EnumsMixin):
#     items = (
#         ("work_order_statuses", WorkOrder.Status),
#         ("service_requests", WorkOrder.ServiceRequest),
#         ("work_order_units", WorkOrder.Units),
#         ("device_statuses", Device.Status),
#         ("device_types", Device.Type),
#         ("notification_status", NotificationHistory.Status),
#         ("notification_types", NotificationType),
#         ("server_statuses", Server.Status),
#         ("tool_statuses", Tool.Status),
#         ("tool_types", Tool.Type),
#         ("tool_locations", Tool.Location),
#         ("tool_softwares", Tool.Software),
#     )
