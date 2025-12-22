class SerializerMapMixin:
    """
    This class allows to use diferent serializers for diferent actions,
    it has to be inherited and then: {action}_serializer_class = Serializer
    """

    serializer_class = NotImplemented
    action = NotImplemented
    request = NotImplemented

    def get_serializer_class(self, action=None):
        if not action:
            action = self.action
        serializer_field = f"{action}_serializer_class"
        serializer_class = getattr(self, serializer_field, self.serializer_class)
        return serializer_class

    def get_host(self):
        protocol = "https" if self.request._request.is_secure() else "http"
        return f"{protocol}://{self.request._request.get_host()}"
