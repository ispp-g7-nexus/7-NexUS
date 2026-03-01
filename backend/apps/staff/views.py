from backend.apps.staff.serializers import StaffSerializer
from backend.apps.staff.models import Staff
from rest_framework import viewsets


class StaffViewSet(viewsets.ModelViewSet):
    queryset = Staff.objects.all()
    serializer_class = StaffSerializer
