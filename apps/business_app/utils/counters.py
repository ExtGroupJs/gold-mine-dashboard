from ..models.task import Task
from ..models.alert import Alert
from datetime import datetime, time, timedelta
from django.utils import timezone

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
        internal_percent_complete__gt=0
    ).prefetch_related("resources")

    for task in tasks:
        # Use the working_hours property from Task model
        task_hours = task.working_hours_for_test
        # Get all resources for this task
        resources = task.resources.all()

        # Calculate hours per day for this task
        current_datetime = timezone.localtime(task.act_start_date)
           
        day_key = current_datetime.date().isoformat()

        daily_summary[day_key]["hours"] += day_hours

        # Calculate fuel and rental costs for this day
        for resource in resources:
            daily_summary[day_key]["fuel_spent"] += (
                task_hours * resource.fuel_spent_by_hour
            )
            daily_summary[day_key]["rental_cost"] += (
                task_hours * resource.rent_cost_by_hour_in_euros
            )


    # Convert to regular dict and round values
    result = {}
    for date_key, values in sorted(daily_summary.items()):
        result[date_key] = {
            "hours": round(values["hours"], 2),
            "fuel_spent": round(values["fuel_spent"], 2),
            "rental_cost": round(values["rental_cost"], 2),
        }

    return result


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
