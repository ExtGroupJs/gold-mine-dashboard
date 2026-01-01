from rest_framework import serializers
from ..models.task import Task
from datetime import datetime
from .alert import AlertSerializer


class TaskSerializer(serializers.ModelSerializer):
    wbs = serializers.StringRelatedField()
    resources = serializers.StringRelatedField(many=True)
    internal_responsibles_names = serializers.StringRelatedField(
        source="internal_responsibles", many=True
    )
    alert_list = AlertSerializer(source="alerts", many=True, read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "internal_status",
            "internal_percent_complete",
            "internal_planned_date",
            "internal_responsibles",
            "internal_responsibles_names",
            "task_code",
            "status_code",
            "wbs",
            "task_name",
            "start_date",
            "end_date",
            "act_start_date",
            "act_end_date",
            "complete_pct",
            "resources",
            "alerts",
            "alert_list",
        ]

    def update(self, instance, validated_data):
        if (
            not instance.internal_planned_date
            and "internal_planned_date" in validated_data
        ):
            validated_data["internal_status"] = Task.INTERNAL_STATUS.PLANNED
        if "internal_percent_complete" in validated_data:
            if validated_data.get("internal_percent_complete") == 100:
                validated_data["internal_status"] = Task.INTERNAL_STATUS.COMPLETED
            elif validated_data.get("internal_percent_complete") != 0:
                validated_data["act_start_date"] = datetime.now()

        if "act_end_date" in validated_data:
            validated_data["internal_status"] = Task.INTERNAL_STATUS.COMPLETED
        if "act_start_date" in validated_data:
            validated_data["internal_status"] = Task.INTERNAL_STATUS.IN_PROGRESS

        return super().update(instance, validated_data)
