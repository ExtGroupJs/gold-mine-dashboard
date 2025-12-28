from rest_framework import serializers
from ..models.alert import Alert


class AlertSerializer(serializers.ModelSerializer):
    task = serializers.StringRelatedField()
    class Meta:
        model = Alert
        fields = "__all__"
