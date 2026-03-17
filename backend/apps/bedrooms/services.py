from .models import Bedroom


def list_available_bedrooms(residence, exclude_membership_id: int | None = None) -> list:
    """
    Devuelve las habitaciones activas con hueco disponible para la residencia.

    exclude_membership_id: excluye ese residente del conteo de ocupantes,
    de forma que su habitación actual aparezca disponible al editar.
    """
    bedrooms = Bedroom.objects.filter(residence=residence, is_active=True).order_by("numero")
    result = []
    for b in bedrooms:
        ocupantes_qs = b.residents.filter(is_active=True, role__name="Student")
        if exclude_membership_id is not None:
            ocupantes_qs = ocupantes_qs.exclude(id=exclude_membership_id)
        ocupantes = ocupantes_qs.count()
        if ocupantes < b.capacidad_maxima:
            result.append({
                "id": b.id,
                "numero": b.numero,
                "edificio": b.edificio,
                "tipo": b.tipo,
                "capacidad_maxima": b.capacidad_maxima,
                "ocupantes_actuales": ocupantes,
            })
    return result


def delete_bedroom(bedroom_id: int, residence) -> bool:
    """
    Elimina una habitación si y solo si no tiene residentes activos asignados.

    - Retorna True si se eliminó correctamente.
    - Retorna False si la habitación no existe en la residencia.
    - Lanza ValueError si hay residentes activos asignados (error controlado → 409).
    """
    try:
        bedroom = Bedroom.objects.get(id=bedroom_id, residence=residence)
    except Bedroom.DoesNotExist:
        return False

    # Verificar residentes activos antes de intentar el borrado
    active_count = bedroom.residents.filter(is_active=True).count()
    if active_count > 0:
        raise ValueError(
            f"No se puede eliminar la habitación '{bedroom.numero}' porque tiene "
            f"{active_count} residente(s) activo(s) asignado(s)."
        )

    # Las memberships inactivas que aún apunten a esta habitación se limpian
    # antes del borrado para no violar la restricción PROTECT.
    bedroom.residents.filter(is_active=False).update(bedroom=None)

    bedroom.delete()
    return True
