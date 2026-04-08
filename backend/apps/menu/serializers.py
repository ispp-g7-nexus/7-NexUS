import datetime
from rest_framework import serializers
from .models import MenuWeek, MenuDay, Meal, SpecialMenuRequest
from apps.residents.models import Resident


class MealSerializer(serializers.ModelSerializer):

    class Meta:
        model = Meal
        fields = [
            'id',
            'name',
            'description',
            'type',
            'is_gluten_free',
            'is_vegetarian',
            'is_vegan',
            'image',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convertir nombres de campos al formato camelCase del frontend
        data['isGlutenFree'] = data.pop('is_gluten_free')
        data['isVegetarian'] = data.pop('is_vegetarian')
        data['isVegan'] = data.pop('is_vegan')
        # Convertir id a string para consistencia con el frontend
        data['id'] = str(data['id'])
        return data


class MenuDaySerializer(serializers.ModelSerializer):

    meals = MealSerializer(many=True, read_only=True)

    class Meta:
        model = MenuDay
        fields = [
            'id',
            'day',
            'date',
            'meals',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        return data


class MenuWeekSerializer(serializers.ModelSerializer):

    days = MenuDaySerializer(many=True, read_only=True)

    class Meta:
        model = MenuWeek
        fields = [
            'id',
            'week_start',
            'week_end',
            'is_published',
            'days',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['weekStart'] = data.pop('week_start')
        data['weekEnd'] = data.pop('week_end')
        data['isPublished'] = data.pop('is_published')
        return data

    def to_internal_value(self, data):
        converted = dict(data)
        if 'isPublished' in converted:
            converted['is_published'] = converted.pop('isPublished')
        return super().to_internal_value(converted)


class MenuWeekListSerializer(serializers.ModelSerializer):

    class Meta:
        model = MenuWeek
        fields = [
            'id',
            'week_start',
            'week_end',
            'is_published',
            'created_at',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['id'] = str(data['id'])
        data['weekStart'] = data.pop('week_start')
        data['weekEnd'] = data.pop('week_end')
        data['isPublished'] = data.pop('is_published')
        data['createdAt'] = data.pop('created_at')
        return data


class MenuWeekCreateSerializer(serializers.ModelSerializer):

    week_start = serializers.DateField(required=True)
    class Meta:
        model = MenuWeek
        fields = ['week_start']

    def validate(self, attrs):
        base_date = attrs.get('week_start')
        if not base_date:
            raise serializers.ValidationError({"week_start": "Debe proporcionar una fecha."})

        monday = base_date - datetime.timedelta(days=base_date.weekday())
        sunday = monday + datetime.timedelta(days=6)

        attrs['week_start'] = monday
        attrs['week_end'] = sunday

        request = self.context.get('request')
        tenant = getattr(request, 'tenant', None)
        
        if not tenant and request:
            from apps.tenants.models import Domain
            host = request.get_host().split(':')[0].lower()
            domain = Domain.objects.filter(domain=host).select_related('tenant').first()
            if domain:
                tenant = domain.tenant

        if tenant:
            if MenuWeek.objects.filter(residence=tenant, week_start=monday).exists():
                raise serializers.ValidationError(
                    "Ya has creado un menú para la semana del " + monday.strftime("%d/%m") + " al " + sunday.strftime("%d/%m") + "."
                )

        return attrs

    def to_internal_value(self, data):
        converted = {}
        converted['week_start'] = data.get('weekStart') or data.get('week_start')
        return super().to_internal_value(converted)


class MealCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Meal
        fields = [
            'name',
            'description',
            'type',
            'is_gluten_free',
            'is_vegetarian',
            'is_vegan',
            'image',
        ]

    def to_internal_value(self, data):
        if hasattr(data, 'dict'):
            converted = data.dict()
        else:
            converted = dict(data)


        if 'image' in data:
            converted['image'] = data['image']

        field_mapping = {
            'isGlutenFree': 'is_gluten_free',
            'isVegetarian': 'is_vegetarian',
            'isVegan': 'is_vegan',
        }
        for frontend_key, backend_field in field_mapping.items():
            if frontend_key in converted:
                val = converted.pop(frontend_key)
                converted[backend_field] = val in ['true', True, 'True']

        return super().to_internal_value(converted)

class SpecialMenuRequestSerializer(serializers.ModelSerializer):
    resident_name = serializers.ReadOnlyField(source='resident.fullname')

    class Meta:
        model = SpecialMenuRequest
        fields = ['id', 'resident', 'resident_name', 'date', 'description', 'status', 'created_at']
        read_only_fields = ['resident', 'created_at']