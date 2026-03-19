from rest_framework import serializers
from apps.membership.models import Membership
from .models import Bedroom


class BedroomResidentSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()


class BedroomSerializer(serializers.ModelSerializer):
    ocupantes_actuales = serializers.SerializerMethodField()
    residentes = serializers.SerializerMethodField()

    class Meta:
        model = Bedroom
        fields = [
            "id",
            "numero",
            "planta",
            "capacidad_maxima",
            "tipo",
            "residence",
            "is_active",
            "created_at",
            "updated_at",
            "edificio",
            "ocupantes_actuales",
            "residentes",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "residence", "ocupantes_actuales", "residentes"]

    def _get_active_student_residents(self, obj: Bedroom):
        prefetched = getattr(obj, "active_student_residents", None)
        if prefetched is not None:
            return prefetched
        return list(
            obj.residents.filter(is_active=True, role__name="Student")
            .select_related("user")
            .order_by("user__first_name", "user__last_name", "user__username")
        )

    def get_ocupantes_actuales(self, obj: Bedroom) -> int:
        return len(self._get_active_student_residents(obj))

    def get_residentes(self, obj: Bedroom):
        residents = self._get_active_student_residents(obj)
        payload = [
            {
                "id": resident.id,
                "full_name": resident.user.get_full_name().strip() or resident.user.username,
            }
            for resident in residents
        ]
        return BedroomResidentSerializer(payload, many=True).data

    def validate_numero(self, value):
        if not value:
            raise serializers.ValidationError("numero is required")

        value = value.strip().upper()

        if len(value) > 50:
            raise serializers.ValidationError("numero too long")

        if not value:
            raise serializers.ValidationError("numero cannot be empty")

        return value

    def validate_edificio(self, value):
        if value is None:
            return None

        value = value.strip()

        if value == "":
            return None

        if len(value) > 100:
            raise serializers.ValidationError("edificio too long")

        return value

    def validate_planta(self, value):
        if value is None:
            return None

        if value < -5 or value > 200:
            raise serializers.ValidationError("planta out of valid range (-5 to 200)")

        return value

    def validate_capacidad_maxima(self, value):
        if value is None:
            return 1

        try:
            iv = int(value)
        except (TypeError, ValueError):
            raise serializers.ValidationError("capacidad_maxima must be integer")

        if iv < 1 or iv > 10:
            raise serializers.ValidationError("capacidad_maxima must be between 1 and 10")

        return iv

    def validate(self, attrs):
        tipo = attrs.get("tipo", getattr(self.instance, "tipo", None))
        capacidad = attrs.get(
            "capacidad_maxima",
            getattr(self.instance, "capacidad_maxima", None)
        )

        expected_capacity = {
            Bedroom.Tipo.INDIVIDUAL: 1,
            Bedroom.Tipo.DOBLE: 2,
            Bedroom.Tipo.TRIPLE: 3,
        }

        if tipo in expected_capacity:
            if capacidad != expected_capacity[tipo]:
                raise serializers.ValidationError({
                    "capacidad_maxima": f"For tipo '{tipo}' capacity must be {expected_capacity[tipo]}"
                })

        return attrs


class ResidentSerializer(serializers.Serializer):
	id = serializers.IntegerField()
	user_id = serializers.IntegerField()
	full_name = serializers.CharField()
	email = serializers.EmailField(allow_null=True)
	residence_id = serializers.IntegerField(allow_null=True)

	@staticmethod
	def from_membership(m: Membership):
		user = m.user
		return {
			"id": m.id,
			"user_id": user.id,
			"full_name": getattr(user, "get_full_name", lambda: str(user))(),
			"email": getattr(user, "email", None),
			"residence_id": m.residence_id,
		}
