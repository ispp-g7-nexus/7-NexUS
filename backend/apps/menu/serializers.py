from rest_framework import serializers
from .models import MenuWeek, MenuDay, Meal


class MealSerializer(serializers.ModelSerializer):

    class Meta:
        model = Meal
        fields = [
            'id',
            'name',
            'description',
            'type',
            'allergens',
            'is_vegetarian',
            'is_vegan',
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Convertir nombres de campos al formato camelCase del frontend
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

    class Meta:
        model = MenuWeek
        fields = ['week_start', 'week_end']

    def validate(self, data):
        if data['week_start'] >= data['week_end']:
            raise serializers.ValidationError(
                "La fecha de inicio debe ser anterior a la fecha de fin."
            )
        return data

    def to_internal_value(self, data):
        converted = {}
        converted['week_start'] = data.get('weekStart') or data.get('week_start')
        converted['week_end'] = data.get('weekEnd') or data.get('week_end')
        return super().to_internal_value(converted)


class MealCreateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Meal
        fields = [
            'name',
            'description',
            'type',
            'allergens',
            'is_vegetarian',
            'is_vegan',
        ]

    def to_internal_value(self, data):
        converted = dict(data)
        if 'isVegetarian' in converted:
            converted['is_vegetarian'] = converted.pop('isVegetarian')
        if 'isVegan' in converted:
            converted['is_vegan'] = converted.pop('isVegan')
        return super().to_internal_value(converted)
