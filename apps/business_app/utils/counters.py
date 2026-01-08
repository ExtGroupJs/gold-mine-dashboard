from ..models.task import Task
from ..models.alert import Alert


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
