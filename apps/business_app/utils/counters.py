from ..models.task import Task
from ..models.alert import Alert
from ..models.resource_owner import ResourceOwner
from datetime import datetime, time, timedelta
from django.utils import timezone
from django.core.cache import cache

from collections import defaultdict


def get_daily_work_summary():
    """
    Calculate daily work summary including:
    - Total working hours per day
    - Total fuel spent per day
    - Total equipment rental cost per day

    Returns:
        dict: Dictionary with dates as keys and daily summary as values
        Example: {
            '2025-01-09': {
                'hours': 16.0,
                'fuel_spent': 48.5,
                'rental_cost': 320.0
            },
            ...
        }
    """
    daily_summary = defaultdict(
        lambda: {"hours": 0.0, "fuel_spent": 0.0, "rental_cost": 0.0}
    )

    # Get all tasks with actual dates
    tasks = Task.objects.filter(
        act_start_date__isnull=False, act_end_date__isnull=False
    ).prefetch_related("resources")

    work_start_time = time(8, 0)
    work_end_time = time(16, 0)

    for task in tasks:
        # Use the working_hours property from Task model
        task_hours = task.working_hours_real
        if not task_hours or task_hours == 0:
            continue

        # Get all resources for this task
        resources = task.resources.all()

        # Calculate hours per day for this task
        current_datetime = timezone.localtime(task.act_start_date)
        end_datetime = timezone.localtime(task.act_end_date)

        while current_datetime.date() <= end_datetime.date():
            day_start = timezone.make_aware(
                datetime.combine(current_datetime.date(), work_start_time)
            )
            day_end = timezone.make_aware(
                datetime.combine(current_datetime.date(), work_end_time)
            )

            period_start = max(current_datetime, day_start)
            period_end = min(end_datetime, day_end)

            if period_start < period_end:
                day_hours = (period_end - period_start).total_seconds() / 3600
                day_key = current_datetime.date().isoformat()

                daily_summary[day_key]["hours"] += day_hours

                # Calculate fuel and rental costs for this day
                for resource in resources:
                    daily_summary[day_key]["fuel_spent"] += (
                        day_hours * resource.fuel_spent_by_hour
                    )
                    daily_summary[day_key]["rental_cost"] += (
                        day_hours * resource.rent_cost_by_hour_in_euros
                    )

            current_datetime = day_start + timedelta(days=1)

    # Convert to regular dict and round values
    result = {}
    for date_key, values in sorted(daily_summary.items()):
        result[date_key] = {
            "hours": round(values["hours"], 2),
            "fuel_spent": round(values["fuel_spent"], 2),
            "rental_cost": round(values["rental_cost"], 2),
        }

    return result


# ////////////////////////////////////////////////////////////


def get_daily_statistics_by_resource():
    """ """
    daily_summary = defaultdict(
        lambda: {
            "hours": 0.0,
            "tasks": [],
            "fuel_spent": 0.0,
            "rental_cost": 0.0,
            "processed_volume": 0.0,
            "processed_area": 0.0,
        }
    )

    # Get all tasks with actual dates
    tasks = (
        Task.objects.filter(
            complete_pct__gt=0,
            resources__isnull=False,
            resources__rent_cost_by_hour_in_euros__gt=0,
        )
        .prefetch_related("resources")
        .order_by("act_start_date")
    )

    for task in tasks:
        current_datetime = timezone.localtime(task.act_start_date)
        day_key = current_datetime.date().isoformat()
        task_info_cache_key = Task.CACHE_KEY_FOR_MANAGEMENT_INFO.format(
            task_id=task.id, percent=task.complete_pct
        )
        task_base_info_cache_key = Task.CACHE_KEY_FOR_MANAGEMENT_BASE_INFO.format(
            task_id=task.id
        )

        if not cache.has_key(task_info_cache_key):
            task_info = {
                "hours": 0.0, 
                "fuel_spent": 0.0,
                "rental_cost": 0.0,
                "processed_volume": 0.0,
                "processed_area": 0.0,
                "owner_info": {},
            }
           

            # Use the working_hours property from Task model
            task_hours = task.working_hours_for_test
            # Get all resources for this task
            task_info["hours"] = task_hours
            base_info["hours"] = base_info["hours"] or Task.DEFAULT_TASK_DURATION

            resources = task.resources.all().select_related("owner")

            for resource in resources:
                task_info["fuel_spent"] += task_hours * resource.fuel_spent_by_hour

                task_info["rental_cost"] += (
                    task_hours * resource.rent_cost_by_hour_in_euros
                )

                task_info["processed_volume"] += (
                    task_hours * resource.processed_volume_by_hour
                )
                task_info["processed_area"] += (
                    task_hours * resource.processed_area_by_hour
                )

            if not has_base_info:
                cache.set(task_base_info_cache_key, base_info, timeout=None)
            cache.set(task_info_cache_key, task_info, timeout=None)
        task_info = cache.get(task_info_cache_key)

        sum_dicts(task_info, daily_summary[day_key])

        daily_summary[day_key]["tasks"] += 1
        daily_summary[day_key]["base_info"]["tasks"] += 1
        if task.complete_pct == 100:
            daily_summary[day_key]["completed_tasks"] += 1

    return daily_summary


# ////////////////////////////////////////////////////////////
def get_daily_work_summary_for_test():
    """
    Calculate daily work summary including:
    - Total working hours per day
    - Total fuel spent per day
    - Total equipment rental cost per day

    Returns:
        dict: Dictionary with dates as keys and daily summary as values
        Example: {
            '2025-01-09': {
                'hours': 16.0,
                'fuel_spent': 48.5,
                'rental_cost': 320.0,
                "processed_volume": 0.0,
                "processed_area": 0.0
            },
            ...
        }
    """
    daily_summary = defaultdict(
        lambda: {
            "hours": 0.0,
            "tasks": 0,
            "completed_tasks": 0,
            "fuel_spent": 0.0,
            "rental_cost": 0.0,
            "processed_volume": 0.0,
            "processed_area": 0.0,
            "base_info": {
                "hours": 0.0,
                "tasks": 0,
                "fuel_spent": 0.0,
                "rental_cost": 0.0,
                "processed_volume": 0.0,
                "processed_area": 0.0,
            },
            "owner_info": {},
        }
    )

    # Get all tasks with actual dates
    tasks = (
        Task.objects.filter(complete_pct__gt=0)
        .prefetch_related("resources")
        .order_by("act_start_date")
    )
    owner_list = ResourceOwner.objects.all().values_list("name", flat=True)

    for task in tasks:
        current_datetime = timezone.localtime(task.act_start_date)
        day_key = current_datetime.date().isoformat()
        task_info_cache_key = Task.CACHE_KEY_FOR_MANAGEMENT_INFO.format(
            task_id=task.id, percent=task.complete_pct
        )
        task_base_info_cache_key = Task.CACHE_KEY_FOR_MANAGEMENT_BASE_INFO.format(
            task_id=task.id
        )

        has_base_info = cache.has_key(task_base_info_cache_key)
        base_info = cache.get(
            task_base_info_cache_key,
            {
                "hours": 0.0,
                "tasks": 0,
                "fuel_spent": 0.0,
                "rental_cost": 0.0,
                "processed_volume": 0.0,
                "processed_area": 0.0,
            },
        )

        if not cache.has_key(task_info_cache_key):
            task_info = {
                "hours": 0.0,
                "fuel_spent": 0.0,
                "rental_cost": 0.0,
                "processed_volume": 0.0,
                "processed_area": 0.0,
                "owner_info": {},
            }
            for owner in owner_list:
                if owner not in daily_summary[day_key]["owner_info"]:
                    daily_summary[day_key]["owner_info"][owner] = {
                        "hours": 0.0,
                        "fuel_spent": 0.0,
                        "rental_cost": 0.0,
                        "processed_volume": 0.0,
                        "processed_area": 0.0,
                    }
                task_info["owner_info"][owner] = {
                    "hours": 0.0,
                    "fuel_spent": 0.0,
                    "rental_cost": 0.0,
                    "processed_volume": 0.0,
                    "processed_area": 0.0,
                }

            # Use the working_hours property from Task model
            task_hours = task.working_hours_for_test
            # Get all resources for this task
            task_info["hours"] = task_hours
            base_info["hours"] = base_info["hours"] or Task.DEFAULT_TASK_DURATION

            resources = task.resources.all().select_related("owner")

            for resource in resources:
                task_info["fuel_spent"] += task_hours * resource.fuel_spent_by_hour

                task_info["rental_cost"] += (
                    task_hours * resource.rent_cost_by_hour_in_euros
                )

                task_info["processed_volume"] += (
                    task_hours * resource.processed_volume_by_hour
                )
                task_info["processed_area"] += (
                    task_hours * resource.processed_area_by_hour
                )

                if resource.owner:
                    task_info["owner_info"][resource.owner.name]["hours"] += task_hours
                    task_info["owner_info"][resource.owner.name]["fuel_spent"] += (
                        task_hours * resource.fuel_spent_by_hour
                    )

                    task_info["owner_info"][resource.owner.name]["rental_cost"] += (
                        task_hours * resource.rent_cost_by_hour_in_euros
                    )
                    task_info["owner_info"][resource.owner.name][
                        "processed_volume"
                    ] += task_hours * resource.processed_volume_by_hour
                    task_info["owner_info"][resource.owner.name]["processed_area"] += (
                        task_hours * resource.processed_area_by_hour
                    )

                if not has_base_info:
                    base_info["fuel_spent"] += (
                        Task.DEFAULT_TASK_DURATION * resource.fuel_spent_by_hour
                    )
                    base_info["rental_cost"] += (
                        Task.DEFAULT_TASK_DURATION * resource.rent_cost_by_hour_in_euros
                    )
                    base_info["processed_volume"] += (
                        Task.DEFAULT_TASK_DURATION * resource.processed_volume_by_hour
                    )
                    base_info["processed_area"] += (
                        Task.DEFAULT_TASK_DURATION * resource.processed_area_by_hour
                    )
            task_info["base_info"] = base_info
            if not has_base_info:
                cache.set(task_base_info_cache_key, base_info, timeout=None)
            cache.set(task_info_cache_key, task_info, timeout=None)
        task_info = cache.get(task_info_cache_key)

        sum_dicts(task_info, daily_summary[day_key])

        daily_summary[day_key]["tasks"] += 1
        daily_summary[day_key]["base_info"]["tasks"] += 1
        if task.complete_pct == 100:
            daily_summary[day_key]["completed_tasks"] += 1

    return daily_summary


def sum_dicts(dict_orig, dict_fin, inplace=True, round_values=2):
    """
    Suma los valores de dos diccionarios con la misma estructura.

    Args:
        dict_orig: Diccionario con los valores a sumar
        dict_fin: Diccionario donde se guardarán los resultados
        inplace: Si True, modifica dict_fin. Si False, devuelve un nuevo diccionario
        round_values: Número de decimales para redondear (None para no redondear)

    Returns:
        Diccionario con los valores sumados
    """
    # Si no se modifica inplace, crea una copia profunda
    if not inplace:
        import copy

        dict_fin = copy.deepcopy(dict_fin)

    for key, value in dict_orig.items():
        # Si la clave no existe en dict_fin, inicialízala
        if key not in dict_fin:
            dict_fin[key] = 0 if not isinstance(value, dict) else {}

        if not isinstance(value, dict):
            # Maneja valores no numéricos
            try:
                # Convierte a float si es posible
                num_value = float(value)
                # Suma y redondea si es necesario
                if round_values is not None:
                    num_value = round(num_value, round_values)
                dict_fin[key] += num_value
            except (ValueError, TypeError):
                # Si no se puede convertir a número, usa el valor original
                dict_fin[key] = value
        else:
            # Llamada recursiva para diccionarios anidados
            dict_fin[key] = sum_dicts(
                value, dict_fin[key], inplace=True, round_values=round_values
            )

    return dict_fin


def get_task_counters():
    info = {}
    task_queryset = Task.objects.all()
    info["total"] = task_queryset.count()
    for status in Task.INTERNAL_STATUS:  # status es un miembro del enum
        if status == Task.INTERNAL_STATUS.NOT_STARTED:
            count = task_queryset.filter(
                internal_status__in=[status, Task.INTERNAL_STATUS.PLANNED]
            ).count()
        elif status == Task.INTERNAL_STATUS.IN_PROGRESS:
            count = task_queryset.filter(
                internal_status__in=[status, Task.INTERNAL_STATUS.WARNING]
            ).count()
        else:
            count = task_queryset.filter(internal_status=status).count()
        info[str(status.label)] = count
        info[f"{status.label}_percent"] = (
            round(count / info["total"] * 100, 2) if info["total"] > 0 else 0
        )
    return info


def get_alert_counters():
    info = {}
    alert_queryset = Alert.objects.all()
    info["total"] = alert_queryset.count()
    for kind in Alert.KIND:  # status es un miembro del enum
        count = alert_queryset.filter(kind=kind).count()
        info[str(kind.label)] = count
        info[f"{kind.label}_percent"] = (
            round(count / info["total"] * 100, 2) if info["total"] > 0 else 0
        )
    return info
