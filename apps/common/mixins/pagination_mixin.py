from collections import OrderedDict

from django.core.paginator import InvalidPage
from rest_framework.exceptions import NotFound
from rest_framework.pagination import PageNumberPagination, _positive_int
from rest_framework.response import Response
from django.conf import settings
from rest_framework import mixins
from rest_framework.decorators import action
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page


class StandardResultsSetPaginationMixin(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        try:
            return super().paginate_queryset(queryset, request, view=view)
        except NotFound:
            return list()

    def get_paginated_response(self, data):
        if hasattr(self, "page") and self.page is not None:
            return super().get_paginated_response(data)
        else:
            return Response(
                OrderedDict(
                    [
                        ("count", None),
                        ("next", None),
                        ("previous", None),
                        ("results", data),
                    ]
                )
            )


class AllResultsSetPaginationMixin(StandardResultsSetPaginationMixin):
    def get_page_size(self, request):
        page_size = request.query_params.get(self.page_size_query_param, None)
        if page_size is not None:
            try:
                return _positive_int(page_size, strict=True)
            except (KeyError, ValueError):
                pass
        return None

    def paginate_queryset(self, queryset, request, view=None):
        page_size = self.get_page_size(request)
        if not page_size:
            if queryset.count() <= 0:
                return list(queryset)
            paginator = self.django_paginator_class(queryset, queryset.count())
            page_number = request.query_params.get(self.page_query_param, 1)
            if page_number in self.last_page_strings:
                page_number = paginator.num_pages

            try:
                self.page = paginator.page(page_number)
            except InvalidPage:
                return list()
            return list(queryset)
        return super().paginate_queryset(queryset, request, view=view)


class GetAllMixin(mixins.ListModelMixin):
    """
    This mixin adds an action to return all the elements of a list, without pagination
    """

    @action(
        detail=False,
        methods=["GET"],
        url_path="get-all",
        url_name="get-all",
    )
    @method_decorator(cache_page(settings.CACHE_DEFAULT_TIMEOUT))
    def get_all(self, request):
        self.pagination_class = AllResultsSetPaginationMixin
        return self.list(request)
