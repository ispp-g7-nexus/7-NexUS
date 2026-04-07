from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.membership.models import Membership, Role

from .models import Staff
from .permissions import IsStaffAdmin
from .serializers import (
    StaffCreateSerializer,
    StaffReadSerializer,
    StaffUpdateSerializer,
)

UserModel = get_user_model()


def _assign_role_membership(user, role_id, residence):
    """Crea o actualiza la Membership de staff (rol no-Student) para el usuario."""
    if not role_id or not residence:
        return
    try:
        role = Role.objects.get(pk=role_id)
    except Role.DoesNotExist:
        return
    # Elimina memberships admin anteriores para este usuario en esta residencia
    Membership.objects.filter(user=user, residence=residence).exclude(
        role__name__iexact="Student"
    ).delete()
    Membership.objects.create(
        user=user,
        role=role,
        residence=residence,
        is_active=True,
    )


class StaffViewSet(viewsets.ModelViewSet):
    """
    CRUD de personal.

    GET    /staff/        → lista
    POST   /staff/        → crear
    GET    /staff/{id}/   → detalle
    PUT    /staff/{id}/   → actualizar completo
    PATCH  /staff/{id}/   → actualizar parcial
    DELETE /staff/{id}/   → eliminar
    """

    permission_classes = [IsAuthenticated, IsStaffAdmin]

    queryset = Staff.objects.select_related("user").all()

    def get_serializer_class(self):
        if self.action == "create":
            return StaffCreateSerializer
        if self.action in ("update", "partial_update"):
            return StaffUpdateSerializer
        return StaffReadSerializer

    def create(self, request, *args, **kwargs):
        serializer = StaffCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        email = data["email"].lower()
        if UserModel.objects.filter(email__iexact=email).exists():
            return Response(
                {"email": "Ya existe un usuario con ese correo electrónico."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        names = (data.get("full_name") or "").strip().split(None, 1)
        first_name = names[0] if names else ""
        last_name = names[1] if len(names) > 1 else ""
        base_username = email.split("@", 1)[0][:30]
        username = base_username
        counter = 1
        while UserModel.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        user = UserModel.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )

        passwd = data.get("password")
        if passwd:
            user.set_password(passwd)
            user.save()
        staff = Staff.objects.create(
            user=user,
            job_title=data["job_title"],
            department=data["department"],
            location=data.get("location", ""),
            schedule=data.get("schedule", ""),
            status=data.get("status", Staff.StatusChoices.ACTIVO),
        )

        role_id = data.get("role_id")
        residence = getattr(request, "residence", None)
        if role_id:
            _assign_role_membership(user, role_id, residence)

        out = StaffReadSerializer(staff)
        return Response(out.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        staff = self.get_object()
        serializer = StaffUpdateSerializer(data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        user = staff.user
        user_dirty = False
        if "full_name" in data:
            names = data["full_name"].strip().split(None, 1)
            user.first_name = names[0] if names else ""
            user.last_name = names[1] if len(names) > 1 else ""
            user_dirty = True
        if "email" in data:
            user.email = data["email"].lower()
            user_dirty = True
        if data.get("password"):
            user.set_password(data["password"])
            user_dirty = True
        if user_dirty:
            user.save()

        for field in ("job_title", "department", "location", "schedule", "status"):
            if field in data:
                setattr(staff, field, data[field])
        staff.save()

        role_id = data.get("role_id")
        residence = getattr(request, "residence", None)
        if role_id:
            _assign_role_membership(staff.user, role_id, residence)

        out = StaffReadSerializer(staff)
        return Response(out.data)

    def destroy(self, request, *args, **kwargs):
        """Elimina el perfil de staff y el usuario asociado."""

        usuario_actual = request.user
        staff = self.get_object()

        if usuario_actual == staff.user:
            return Response(
                {"detail": "No puedes eliminar tu propio perfil de staff."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        with transaction.atomic():
            user = staff.user
            staff.delete()
            user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
