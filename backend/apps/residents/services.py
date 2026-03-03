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
