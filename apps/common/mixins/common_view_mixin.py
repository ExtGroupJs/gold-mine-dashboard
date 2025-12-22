from django.db.models import Case, F, Q, Value, When
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from rest_framework.generics import GenericAPIView

from apps.common.filters import CommonFilter


class CommonOrderingFilter(filters.OrderingFilter):
    custom_order = None

    def get_ordering(self, request, queryset, view):
        self.custom_order = []
        ordering = super().get_ordering(request, queryset, view)

        # this because there may be some clases that uses this
        # AstechOrderingFilter but do not inherit from AstechViewMixin
        if not ordering:
            ordering = [f"{queryset.model._meta.pk.name}"]
        list_to_return = list(ordering) + [f"{queryset.model._meta.pk.name}"]
        return list_to_return

    def _get_order_for_choice_query(self, stripped_field, choices, reverse):
        sorted_choice_field = {
            val[0]: idx
            for idx, val in enumerate(
                sorted(
                    choices,
                    key=lambda x: x[1],
                    reverse=reverse,
                )
            )
        }
        order_for_choice_query = Case(
            *[
                When(
                    condition=Q((stripped_field, key)),
                    then=Value(val),
                )
                for key, val in sorted_choice_field.items()
            ]
        )
        return order_for_choice_query

    def filter_queryset(self, request, queryset, view):
        """
        this function order the choice fields using the labels of the
        choices in an independant way of the value that represent this
        choice in the db, if the order criteria is not a choice
        field, it ordered in the same way as usual.

        """
        if self.custom_order:
            ordering = self.custom_order + [f"{queryset.model._meta.pk.name}"]
        else:
            ordering = self.get_ordering(request, queryset, view)

        queryset_model = queryset.model
        if ordering:
            final_order = []
            for current_criteria in ordering:
                stripped_field = current_criteria.strip("-")
                try:
                    current_criteria_choices = getattr(
                        queryset_model, stripped_field
                    ).field.choices
                except AttributeError:
                    # the current_criteria does not belong to any field of the
                    # queryset model itself
                    # (maybe a field from a FK relation of the model).
                    final_order.append(current_criteria)
                    continue
                final_order.append(
                    self._get_order_for_choice_query(
                        stripped_field=stripped_field,
                        choices=current_criteria_choices,
                        reverse="-" in current_criteria,
                    )
                ) if current_criteria_choices else final_order.append(current_criteria)
            ordering_with_nulls_last = []
            for field in final_order:
                if isinstance(field, str):
                    f_expr = F(field.strip("-"))
                    order = f_expr.asc if field[0] != "-" else f_expr.desc
                    ordering_with_nulls_last.append(order(nulls_last=True))
                else:
                    ordering_with_nulls_last.append(field)
            return queryset.order_by(*ordering_with_nulls_last)
        return queryset


class CommonViewMixin(GenericAPIView):
    """
    Use this as parent class in all views. Adds:
     - ordering
     - default filtering
    """

    # Filtering
    _filter_class = None
    ordering_fields = "__all__"
    ordering = ["-created_timestamp"]
    # filterset_fields = [field.name for field in queryset.model._meta.fields]
    filterset_class = CommonFilter
    filter_backends = [
        DjangoFilterBackend,
        filters.SearchFilter,
        CommonOrderingFilter,
    ]
