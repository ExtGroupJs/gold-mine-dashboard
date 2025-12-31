from ..models.task import Task
from ..models.alert import Alert


def get_task_counters():
    info = {}
    task_queryset = Task.objects.all()
    for status in Task.INTERNAL_STATUS:  # status es un miembro del enum
        info[str(status.label)] = task_queryset.filter(internal_status=status).count()
    info["total"] = task_queryset.count()
    return info


def get_alert_counters():
    info = {}
    alert_queryset = Alert.objects.all()

    for kind in Alert.KIND:  # status es un miembro del enum
        info[str(kind.label)] = alert_queryset.filter(kind=kind).count()
    info["total"] = alert_queryset.count()
    return info
