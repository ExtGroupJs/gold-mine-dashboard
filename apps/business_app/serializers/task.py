from rest_framework import serializers
from ..models.task import Task


class TaskSerializer(serializers.ModelSerializer):
    wbs = serializers.StringRelatedField()
    resources = serializers.StringRelatedField(many=True)
    internal_responsibles = serializers.StringRelatedField(many=True)

    class Meta:
        model = Task
        fields = "__all__"
