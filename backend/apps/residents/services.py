from django.contrib.auth import get_user_model

from apps.residences.models import Membership
from apps.common.services import process_password_reset_request

UserModel = get_user_model()


def create_resident(data: dict, residence, request) -> dict:
    """
    Lógica de negocio para dar de alta a un residente.

    1. Busca si ya existe un User con ese email.
    2. Si no existe, crea el User con un username único derivado del email.
    3. Si se proporcionó contraseña, la establece; si no, envía un correo de
       restablecimiento para que el residente configure la suya.
    4. Crea la Membership con rol RESIDENT en la residencia, si no existe ya.

    Retorna un dict con { 'created': bool, 'email': str }.
    """
    email = data["email"].lower()
    user = UserModel.objects.filter(email__iexact=email).first()
    created = False

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

    if not Membership.objects.filter(
        user=user, role=Membership.Role.RESIDENT, residence=residence
    ).exists():
        Membership.objects.create(
            user=user,
            role=Membership.Role.RESIDENT,
            residence=residence,
            is_active=True,
        )

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

    Los campos room, building y check_in_date se reservan para cuando el
    modelo Membership los incorpore; por ahora se devuelven como vacíos
    para que el serializer de lectura no falle.
    """
    user = membership.user
    full_name = f"{user.first_name} {user.last_name}".strip() or user.username
    return {
        "id": membership.id,
        "full_name": full_name,
        "email": user.email,
        "is_active": membership.is_active,
        # Estos campos no existen todavía en el modelo; se devuelven vacíos
        # para que ResidentReadSerializer no genere errores de tipo.
        "room": getattr(membership, "room", "") or "",
        "building": getattr(membership, "building", "") or "",
        "check_in_date": getattr(membership, "check_in_date", None),
        "created_at": membership.created_at,
    }


def list_residents(residence) -> list:
    """Devuelve todos los residentes (User+Membership) de una residencia."""
    memberships = (
        Membership.objects.filter(role=Membership.Role.RESIDENT, residence=residence)
        .select_related("user")
        .order_by("created_at")
    )
    return [_membership_to_dict(m) for m in memberships]


def get_resident(membership_id: int, residence):
    """Devuelve un residente por el ID de su Membership, o None si no existe."""
    try:
        membership = Membership.objects.select_related("user").get(
            id=membership_id, role=Membership.Role.RESIDENT, residence=residence
        )
    except Membership.DoesNotExist:
        return None
    return _membership_to_dict(membership)


def update_resident(membership_id: int, data: dict, residence) -> dict | None:
    """
    Actualiza los datos de un residente (email, full_name, is_active).
    Retorna el dict actualizado o None si no existe.
    """
    try:
        membership = Membership.objects.select_related("user").get(
            id=membership_id, role=Membership.Role.RESIDENT, residence=residence
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

    if "is_active" in data:
        membership.is_active = data["is_active"]
        membership.save()

    return _membership_to_dict(membership)


def delete_resident(membership_id: int, residence) -> bool:
    """
    Soft-delete: desactiva la Membership del residente.
    Retorna True si se desactivó, False si no existía.
    """
    try:
        membership = Membership.objects.get(
            id=membership_id, role=Membership.Role.RESIDENT, residence=residence
        )
    except Membership.DoesNotExist:
        return False

    membership.is_active = False
    membership.save()
    return True
