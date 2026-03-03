from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Incidence, IncidenceUpdate # Corregido el import
from .serializers import IncidenceSerializer
from .permissions import IsAdminOrReadOnly
from apps.common.authentication import CookieJWTAuthentication

class IncidenceViewSet(viewsets.ModelViewSet):
    authentication_classes = [CookieJWTAuthentication]
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    serializer_class = IncidenceSerializer

    def get_queryset(self):
        user = self.request.user
        if user.is_staff:
            return Incidence.objects.all()
        return Incidence.objects.filter(student=user)

    def perform_create(self, serializer):
        
        user = self.request.user
        location_type = self.request.data.get('location_type')
        
        room = None
        if location_type == 'habitacion':
            # Si elige Mi Habitación, añadimos el número de habitación del estudiante
            #room = user.profile.room_number  # Asumiendo que el número de habitación sea así
            room = "3º A " #Ejemplo para admin
        # ------------------------------------
        else:
            room = None
        serializer.save(student=user, room_number=room)
        

    def perform_update(self, serializer):
        """
        Lógica para el panel de Admin (Gestionar) y 
        soporte (Visualización de notas y comentarios rápidos).
        """
        instance = self.get_object()
        old_status = instance.status
        
        updated_incidence = serializer.save()
        
        new_status = updated_incidence.status
        quick_comment = self.request.data.get('quick_comment') # Campo para comentarios rápidos

        if old_status != new_status or quick_comment:
            log_text = ""
            if old_status != new_status:
                log_text += f"Estado cambiado de {old_status} a {new_status}. "
            if quick_comment:
                log_text += f"Nota: {quick_comment}"

            # Esto crea el registro que se ve en el historial del modal "Gestionar"
            IncidenceUpdate.objects.create(
                incidence=updated_incidence,
                author_name="Staff",
                text=log_text
            )

    def perform_destroy(self, instance):
        instance.delete()