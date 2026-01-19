from rest_framework import serializers
from ..models.alert import Alert
from ..models.task import Task
from ..signals import (
    send_update_task_dashboard,
    send_update_alert_dashboard,
    notify_created_alert,
)


class AlertSerializer(serializers.ModelSerializer):
    task_name = serializers.StringRelatedField(source="task")
    kind_name = serializers.SerializerMethodField()
    motive_alert_status_name = serializers.SerializerMethodField()

    class Meta:
        model = Alert
        fields = [
            "id",
            "task",
            "task_name",
            "kind",
            "kind_name",
            "motive_alert_status",
            "motive_alert_status_name",
            "short_description",
        ]
        read_only_fields = ["created_at", "updated_at"]

    def validate_task(self, value):
        if value.internal_status == Task.INTERNAL_STATUS.COMPLETED:
            raise serializers.ValidationError("Task is already completed")
        if Alert.objects.filter(task=value).exists():
            raise serializers.ValidationError("Task already has an alert")
        return value

    def get_kind_name(self, obj):
        return str(Alert.KIND(obj.kind).label)

    def get_motive_alert_status_name(self, obj):
        return str(Alert.MOTIVES(obj.motive_alert_status).label)

    def update_task_internal_status(self, alert):
        task = alert.task
        new_internal_status = Task.INTERNAL_STATUS.IN_PROGRESS
        if Alert.objects.filter(task=task, kind=Alert.KIND.CRITICAL).exists():
            new_internal_status = Task.INTERNAL_STATUS.HOLD
        elif Alert.objects.filter(task=task, kind=Alert.KIND.WARNING).exists():
            new_internal_status = Task.INTERNAL_STATUS.WARNING

        if task.internal_status != new_internal_status:
            task.internal_status = new_internal_status
            task.save(update_fields=["internal_status"])
            send_update_task_dashboard()

    def create(self, validated_data):
        instance = super().create(validated_data)
        self.update_task_internal_status(instance)
        send_update_alert_dashboard()
        notify_created_alert(instance)
        return instance

    def update(self, instance, validated_data):
        instance = super().update(instance, validated_data)
        if "kind" in validated_data:
            self.update_task_internal_status(instance)
            send_update_alert_dashboard()
        return instance
