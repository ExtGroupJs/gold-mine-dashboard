from rest_framework import serializers
from ..models.alert import Alert


class AlertSerializer(serializers.ModelSerializer):
    task_name = serializers.StringRelatedField(source="task")

    class Meta:
        model = Alert
        fields = [
            "id",
            "task",
            "task_name",
            "alert_type",
            "alert_message",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["created_at", "updated_at"]
    
    def save(self, **kwargs):
        validated_data = {**self.validated_data, **kwargs}
        if not self.instance:
            self.instance = ShopProducts.objects.create(**validated_data)
        if "alert_type" in validated_data:
            if validated_data["alert_type"] == Alert.KIND.CRITICAL:
                self.instance.task.internal_status = Task.INTERNAL_STATUS.HOLD
            else:
                self.instance.task.internal_status = Task.INTERNAL_STATUS.IN_PROGRESS
            self.instance.task.save(update_fields=["internal_status"])        
        return self.instance

