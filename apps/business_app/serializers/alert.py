from rest_framework import serializers
from ..models.alert import Alert
from ..models.task import Task


class AlertSerializer(serializers.ModelSerializer):
    task_name = serializers.StringRelatedField(source="task")

    class Meta:
        model = Alert
        fields = [
            "id",
            "task",
            "task_name",
            "kind",
            "short_description",
            "description",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def update_task_internal_status(self, alert):
        task = alert.task
        if task.internal_status == Task.INTERNAL_STATUS.COMPLETED:
            return
        if Alert.objects.filter(task=task, kind=Alert.KIND.CRITICAL).exists():
            task.internal_status = Task.INTERNAL_STATUS.HOLD
        else:
            task.internal_status = Task.INTERNAL_STATUS.IN_PROGRESS
        task.save(update_fields=["internal_status"])

    def create(self, validated_data):
        instance = super().create(validated_data)
        self.update_task_internal_status(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        self.update_task_internal_status(instance)
        return instance
