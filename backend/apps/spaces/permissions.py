from apps.membership.permissions import has_screen_permission


def is_reservations_admin(user, residence) -> bool:
    """
    Verifica si el usuario tiene permisos de administrador para la pantalla 'reservations' (Espacios comunes).
    """
    if not user or not user.is_authenticated:
        return False
    return has_screen_permission(user, residence, "reservations")
