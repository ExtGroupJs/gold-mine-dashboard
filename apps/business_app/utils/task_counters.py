from ..models.task import Task

def get_task_counters():
    resp = {}
    task_queryset = Task.objects.all()
    for status in Task.INTERNAL_STATUS:  # status es un miembro del enum
        resp[str(status.label)] = task_queryset.filter(
            internal_status=status
        ).count()
    resp["total"] = task_queryset.count()
    return resp