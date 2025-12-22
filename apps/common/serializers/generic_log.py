from rest_framework import serializers

from apps.common.models.generic_log import GenericLog


class GenericLogSerializer(serializers.ModelSerializer):
    model_class = serializers.SerializerMethodField()
    created_timestamp = serializers.SerializerMethodField()
    created_by = serializers.SerializerMethodField()

    class Meta:
        model = GenericLog
        fields = [
            "id",
            "created_timestamp",
            "performed_action",
            "content_type",
            "model_class",
            "object_id",
            "details",
            "created_by",
        ]
        read_only_fields = ["id", "created_timestamp", "created_by"]

    def get_model_class(self, object):
        return object.content_type.name

    def get_created_timestamp(self, object):
        return object.created_timestamp.strftime("%d-%h-%Y a las %I:%M %p")

    def get_created_by(self, object):
        return object.created_by.__str__()
