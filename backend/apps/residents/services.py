from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from apps.membership.models import Membership, Role
from apps.common.services import process_password_reset_request
from apps.packages.services import update_resident_packages_snapshot

UserModel = get_user_model()


def _sync_user_active_status(user) -> None:
    """Activa o desactiva el usuario según si mantiene memberships activas."""
    has_active_memberships = Membership.objects.filter(user=user, is_active=True).exists()
    if user.is_active != has_active_memberships:
        user.is_active = has_active_memberships
        user.save(update_fields=["is_active"])


def _get_bedroom(bedroom_id: int, residence, exclude_membership_id: int | None = None):
    """Valida que la habitación exista, pertenezca a la residencia y tenga capacidad.

    exclude_membership_id: ID de la Membership del residente que se está editando,
    para no contarlo como ocupante al calcular la capacidad disponible.
    """
    from apps.bedrooms.models import Bedroom

    try:
        # Fix #1: rechazar habitaciones desactivadas
        bedroom = Bedroom.objects.get(id=bedroom_id, residence=residence, is_active=True)
    except Bedroom.DoesNotExist:
        raise ValidationError(
            {"bedroom_id": "La habitación no existe, no pertenece a esta residencia o está desactivada."}
        )

    # Fix #2: solo contar ocupantes con rol Student para no bloquear huecos por otros roles
    ocupantes_qs = bedroom.residents.filter(is_active=True, role__name="Student")
    if exclude_membership_id is not None:
        ocupantes_qs = ocupantes_qs.exclude(id=exclude_membership_id)

    if ocupantes_qs.count() >= bedroom.capacidad_maxima:
        raise ValidationError(
            {"bedroom_id": f"La habitación '{bedroom.numero}' ya está al completo "
                           f"({bedroom.capacidad_maxima}/{bedroom.capacidad_maxima} ocupantes)."}
        )

    return bedroom


def _get_student_role() -> Role:
    """Devuelve (o crea) el rol de sistema 'Student'."""
    role, _ = Role.objects.get_or_create(
        name="Student",
        residence=None,
        defaults={
            "description": "Estudiante / Residente",
            "is_system_default": True,
        },
    )
    return role


def create_resident(data: dict, residence, request) -> dict:
    """
    Lógica de negocio para dar de alta a un residente.

    1. Busca si ya existe un User con ese email.
    2. Si no existe, crea el User con un username único derivado del email.
    3. Si se proporcionó contraseña, la establece; si no, envía un correo de
       restablecimiento para que el residente configure la suya.
    4. Crea la Membership con rol Student en la residencia, si no existe ya.
    5. Si se proporcionó bedroom_id, valida y asigna la habitación.

    Retorna un dict con { 'created': bool, 'email': str }.
    """
    email = data["email"].lower()
    user = UserModel.objects.filter(email__iexact=email).first()
    created = False

    # Validar habitación antes de crear/buscar el usuario para fallar pronto
    bedroom = None
    bedroom_id = data.get("bedroom_id")
    if bedroom_id is not None:
        bedroom = _get_bedroom(bedroom_id, residence)

    if not user:
        base_username = email.split("@", 1)[0][:30]
        username = base_username
        counter = 1
        while UserModel.objects.filter(username=username).exists():
            username = f"{base_username}{counter}"
            counter += 1

        names = (data.get("full_name") or "").strip().split(None, 1)
        first_name = names[0] if names else ""
        last_name = names[1] if len(names) > 1 else ""

        user = UserModel.objects.create(
            username=username,
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_active=True,
        )
        created = True

        passwd = data.get("password")
        if passwd:
            user.set_password(passwd)
            user.save()

    student_role = _get_student_role()

    existing_membership = Membership.objects.filter(
        user=user, role=student_role, residence=residence
    ).first()

    if existing_membership is None:
        Membership.objects.create(
            user=user,
            role=student_role,
            residence=residence,
            is_active=True,
            bedroom=bedroom,
        )
    else:
        # Fix #3: reactivar Membership inactiva (residente dado de baja y re-registrado)
        # y actualizar habitación si se proporcionó
        update_fields = {"is_active": True}
        if bedroom is not None:
            update_fields["bedroom"] = bedroom
        for attr, val in update_fields.items():
            setattr(existing_membership, attr, val)
        existing_membership.save()

    _sync_user_active_status(user)

    passwd = data.get("password")
    if passwd:
        if not created:
            user.set_password(passwd)
            user.save()
    else:
        try:
            process_password_reset_request(user.email, request)
        except Exception:
            pass

    return {"created": created, "email": user.email}


def _membership_to_dict(membership) -> dict:
    """Convierte User + Membership en un dict con los campos del residente.

    Los campos room y building se obtienen de la habitación asignada (FK bedroom).
    """
    user = membership.user
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    bedroom = membership.bedroom  # ya resuelto gracias a select_related
    return {
        "id": membership.id,
        "full_name": full_name,
        "email": user.email,
        "is_active": membership.is_active,
        "bedroom_id": bedroom.id if bedroom else None,
        "room": bedroom.numero if bedroom else "",
        "building": bedroom.edificio if bedroom else "",
        "check_in_date": getattr(membership, "check_in_date", None),
        "created_at": membership.created_at,
    }


def list_residents(residence) -> list:
    """Devuelve todos los residentes (User+Membership) de una residencia."""
    memberships = (
        Membership.objects.filter(role__name="Student", residence=residence)
        .select_related("user", "role", "bedroom")
        .order_by("created_at")
    )
    return [_membership_to_dict(m) for m in memberships]


def get_resident(membership_id: int, residence):
    """Devuelve un residente por el ID de su Membership, o None si no existe."""
    try:
        membership = Membership.objects.select_related("user", "role", "bedroom").get(
            id=membership_id, role__name="Student", residence=residence
        )
    except Membership.DoesNotExist:
        return None
    return _membership_to_dict(membership)


def update_resident(membership_id: int, data: dict, residence) -> dict | None:
    """
    Actualiza los datos de un residente (email, full_name, is_active, bedroom).
    Retorna el dict actualizado o None si no existe.
    """
    try:
        membership = Membership.objects.select_related("user", "role", "bedroom").get(
            id=membership_id, role__name="Student", residence=residence
        )
    except Membership.DoesNotExist:
        return None

    user = membership.user

    if "email" in data:
        user.email = data["email"].lower()

    if "full_name" in data:
        names = (data["full_name"] or "").strip().split(None, 1)
        user.first_name = names[0] if names else ""
        user.last_name = names[1] if len(names) > 1 else ""

    user.save()

    membership_dirty = False

    if "is_active" in data:
        membership.is_active = data["is_active"]
        membership_dirty = True

    if "bedroom_id" in data:
        if data["bedroom_id"] is None:
            # Desasignar habitación explícitamente
            membership.bedroom = None
        else:
            # Excluir al propio residente del conteo de capacidad
            membership.bedroom = _get_bedroom(
                data["bedroom_id"], residence, exclude_membership_id=membership.id
            )
        membership_dirty = True

    if membership_dirty:
        membership.save()

    # si se cambió el nombre o la habitación, actualizar el snapshot de paquetes para que refleje esos cambios
    if "full_name" in data or "bedroom_id" in data:
        update_resident_packages_snapshot(membership)

    if "is_active" in data:
        _sync_user_active_status(user)

    return _membership_to_dict(membership)


def delete_resident(membership_id: int, residence) -> bool:
    """
    Hard-delete: elimina físicamente la Membership del residente.
    Si el usuario se queda sin memberships, elimina también su cuenta.
    Devuelve True si se eliminó, False si no existía.
    """
    try:
        membership = Membership.objects.select_related("user").get(
            id=membership_id, role__name="Student", residence=residence
        )
    except Membership.DoesNotExist:
        return False

    user = membership.user

    membership.delete()

    has_other_memberships = Membership.objects.filter(user=user).exists()
    if not has_other_memberships:
        user.delete()
    else:
        _sync_user_active_status(user)

    return True
