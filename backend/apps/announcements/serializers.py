from rest_framework import serializers
from django.utils import timezone
from .models import Announcement


TITLE_MAX_LENGTH = 50
DESCRIPTION_MAX_LENGTH = 255

COMMON_READ_ONLY_FIELDS = [
    'id',
    'publication_date',
    'has_passed',
    'residence',
    'user',
    'created_by_name',
    'created_at',
    'updated_at',
]


class AnnouncementSerializer(serializers.ModelSerializer):
    """Serializer completo para el modelo Announcement."""

    title = serializers.CharField(
        max_length=TITLE_MAX_LENGTH,
        error_messages={
            'required': 'El título es obligatorio',
            'blank': 'El título no puede estar vacío',
            'max_length': f'El título no puede contener más de {TITLE_MAX_LENGTH} caracteres.',
        },
    )
    description = serializers.CharField(
        max_length=DESCRIPTION_MAX_LENGTH,
        error_messages={
            'required': 'La descripción es obligatoria',
            'blank': 'La descripción no puede estar vacía',
            'max_length': f'La descripción no puede contener más de {DESCRIPTION_MAX_LENGTH} caracteres.',
        },
    )
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    has_passed = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'description',
            'category',
            'category_display',
            'featured',
            'publication_date',
            'announcement_date',
            'has_passed',
            'residence',
            'user',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = COMMON_READ_ONLY_FIELDS

        extra_kwargs = {
            'announcement_date': {
                'error_messages': {
                    'required': 'La fecha del aviso es obligatoria',
                    'invalid': 'Formato de fecha inválido'
                }
            },
            'category': {
                'error_messages': {
                    'invalid_choice': 'Categoría no válida. Opciones: URGENT, MAINTENANCE, EVENT, GENERAL'
                }
            },
        }

    def get_created_by_name(self, obj):
        if obj.user:
            return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.email
        return None

    def validate_announcement_date(self, value):
        if value < timezone.now().date():
            raise serializers.ValidationError("La fecha no puede estar en pasado.")
        return value


class AnnouncementListSerializer(serializers.ModelSerializer):
    """Serializer ligero para listados."""

    category_display = serializers.CharField(source='get_category_display', read_only=True)
    has_passed = serializers.BooleanField(read_only=True)

    class Meta:
        model = Announcement
        fields = [
            'id',
            'title',
            'description',
            'category',
            'category_display',
            'featured',
            'publication_date',
            'announcement_date',
            'has_passed',
            'user',
        ]