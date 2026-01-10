from rest_framework import serializers
from ..models.task import Task
from ..models.alert import Alert
from datetime import datetime
from .alert import AlertSerializer
from ..utils.pusher_client import PusherClient
from django.core.cache import cache


class TaskSerializer(serializers.ModelSerializer):
    wbs = serializers.StringRelatedField()
    resources = serializers.StringRelatedField(many=True)
    internal_responsibles_names = serializers.StringRelatedField(
        source="internal_responsibles", many=True
    )
    alert_list = AlertSerializer(source="alerts", many=True, read_only=True)
    internal_status_name = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            "id",
            "internal_status",
            "internal_status_name",
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

    def get_internal_status_name(self, obj):
        return str(Task.INTERNAL_STATUS(obj.internal_status).label)

    def validate(self, data):
        if self.instance and self.instance.internal_status == Task.INTERNAL_STATUS.COMPLETED:
            raise serializers.ValidationError(
                "The task has already been COMPLETED. No further changes can be made on it."
            ) 
        if (
            "internal_planned_date" in data
            and data.get("internal_responsibles", []) == []
        ):
            raise serializers.ValidationError(
                "Responsible Roles must be set when Planned Date is set."
            )
        if (
            data.get("internal_responsibles", []) != []
            and "internal_planned_date" not in data
        ):
            raise serializers.ValidationError(
                "Planned Date must be set when Responsible Roles are set."
            )
        
        return data

    def _remove_from_cache(self, instance):
        cache_key = Task.CACHE_KEY_FOR_MANAGEMENT_INFO.format(
            task_id=instance.id, percent=instance.complete_pct
        )
        if cache.has_key(cache_key):
            cache.delete(cache_key)

    def _complete_task(self, instance, validated_data):
        validated_data["internal_status"] = Task.INTERNAL_STATUS.COMPLETED
        validated_data["complete_pct"] = 100
        validated_data["act_end_date"] = datetime.now()
        self._remove_from_cache(instance)

    def update(self, instance, validated_data):
        if "internal_planned_date" in validated_data:
            validated_data["internal_status"] = Task.INTERNAL_STATUS.PLANNED
        elif "act_end_date" in validated_data:
            self._complete_task(validated_data=validated_data)

        elif "complete_pct" in validated_data:
            complete_pct_value = validated_data.get(
                "complete_pct"
            )
            if complete_pct_value == 100:
                self._complete_task(validated_data=validated_data)
            elif complete_pct_value != 0:
                if not instance.act_start_date:
                    validated_data["act_start_date"] = datetime.now()
                validated_data["internal_status"] = Task.INTERNAL_STATUS.IN_PROGRESS
                Alert.objects.filter(task=instance, kind=Alert.KIND.CRITICAL).delete()
                self._remove_from_cache(instance)
                validated_data["act_end_date"] = None

        if "act_start_date" in validated_data:
            validated_data["internal_status"] = Task.INTERNAL_STATUS.IN_PROGRESS
            Alert.objects.filter(task=instance, kind=Alert.KIND.CRITICAL).delete()

        if validated_data.get("internal_responsibles", []) != []:
            pusher_client = PusherClient() # update supervisors list
            payload = validated_data.get("internal_responsibles")

            pusher_client.trigger(
                PusherClient.TASK_CHANNEL,
                PusherClient.UPDATE_TASK_EVENT_FOR_SUPERVISOR,
                {"internal_responsibles": [rol.id for rol in payload]},
            )

        return super().update(instance, validated_data)
