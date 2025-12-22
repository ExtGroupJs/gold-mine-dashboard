import threading
from django.utils.deprecation import MiddlewareMixin

# Almacenamos el request por hilo
_requests = threading.local()


class GetRequestUserMiddleware(MiddlewareMixin):
    def process_request(self, request):
        # Almacena el request en el hilo actual
        _requests.request = request

    def process_response(self, request, response):
        # Limpia el request cuando la respuesta está lista
        if hasattr(_requests, "request"):
            del _requests.request
        return response

    def process_exception(self, request, exception):
        # Limpia el request si ocurre una excepción
        if hasattr(_requests, "request"):
            del _requests.request


def get_current_user():
    """With this method the current user can be obtained globally in the app"""
    if hasattr(_requests, "request"):
        return _requests.request.user
    return None
