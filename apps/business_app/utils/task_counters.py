from ..models.task import Task
from ..models.alert import Alert


def get_task_counters():
    resp = {}
    task_info = {}
    task_queryset = Task.objects.all()

    for status in Task.INTERNAL_STATUS:  # status es un miembro del enum
        task_info[str(status.label)] = task_queryset.filter(
            internal_status=status
        ).count()
    task_info["total"] = task_queryset.count()
    resp["task_info"] = task_info

    alert_info = {}
    alert_queryset = Alert.objects.all()

    for kind in Alert.KIND:  # status es un miembro del enum
        alert_info[str(kind.label)] = alert_queryset.filter(kind=kind).count()
    alert_info["total"] = alert_queryset.count()
    resp["alert_info"] = alert_info
    return resp
