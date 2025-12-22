from rest_framework import serializers

from apps.common.models import BaseModel


class BaseModelSerializer(serializers.ModelSerializer):
    class Meta:
        model = BaseModel
        fields = [
            "created_timestamp",
            "updated_timestamp",
        ]
