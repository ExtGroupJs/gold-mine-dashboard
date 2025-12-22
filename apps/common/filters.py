import django_filters


class CommonFilter(django_filters.FilterSet):
    """
    This should be used as a base class for all filters
    """

    # is_active = django_filters.BooleanFilter(field_name="deleted", lookup_expr="isnull")
    # created_after = django_filters.DateTimeFilter(
    #     field_name="created_timestamp", lookup_expr="date__gte"
    # )
    # created_before = django_filters.DateTimeFilter(
    #     field_name="created_timestamp", lookup_expr="date__lte"
    # )
    # updated_after = django_filters.DateTimeFilter(
    #     field_name="updated_timestamp", lookup_expr="date__gte"
    # )
    # updated_before = django_filters.DateTimeFilter(
    #     field_name="updated_timestamp", lookup_expr="date__lte"
    # )
    # deleted_after = django_filters.DateTimeFilter(
    #     field_name="deleted", lookup_expr="date__gte"
    # )
    # deleted_before = django_filters.DateTimeFilter(
    #     field_name="deleted", lookup_expr="date__lte"
    # )
