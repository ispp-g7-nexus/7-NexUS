import json
from django.http import JsonResponse
from django.views import View
from django.utils.decorators import method_decorator
from .models import Event, EventParticipation
from django.shortcuts import get_object_or_404
from django.db.utils import IntegrityError
from django.contrib.auth import get_user_model
from django.views.decorators.csrf import csrf_exempt
from apps.common.utils.jwt_auth import resolve_user_from_request
from django.utils.dateparse import parse_datetime
from django.utils import timezone

@method_decorator(csrf_exempt, name='dispatch')
class AuthenticatedView(View):
    def dispatch(self, request, *args, **kwargs):
        if not request.user.is_authenticated:
            user_data = resolve_user_from_request(request)
            if user_data:
                User = get_user_model()
                try:
                    request.user = User.objects.get(id=user_data['id'])
                except User.DoesNotExist:
                    return JsonResponse({"detail": "User not found."}, status=401)
            else:
                return JsonResponse({"detail": "Authentication credentials were not provided."}, status=401)
        return super().dispatch(request, *args, **kwargs)

class EventListView(AuthenticatedView):
    def get(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
            
        events = Event.objects.filter(residence=request.residence).select_related('host')
        data = []
        for event in events:
            is_joined = event.participations.filter(user=request.user).exists()
            can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
            data.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'created_at': event.created_at.isoformat(),
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'location': event.location,
                'image_url': event.image_url,
                'tags': event.tags,
                'max_participants': event.max_participants,
                'participants_count': event.participants_count,
                'can_join': event.can_join(),
                'can_edit': can_edit,
                'is_joined': is_joined,
                'host': {
                    'id': event.host.id,
                    'first_name': event.host.first_name,
                    'last_name': event.host.last_name,
                }
            })
        return JsonResponse(data, safe=False)

    def post(self, request):
        if not hasattr(request, 'residence') or not request.residence:
            return JsonResponse({"detail": "No residence context."}, status=400)
            
        try:
            body = json.loads(request.body)
            
            start_time_str = body.get('start_time')
            end_time_str = body.get('end_time')
            
            if not start_time_str or not end_time_str:
                return JsonResponse({"detail": "Se requiere fecha de inicio y fin."}, status=400)
                
            start_time = parse_datetime(start_time_str)
            end_time = parse_datetime(end_time_str)
            
            if start_time and start_time < timezone.now():
                return JsonResponse({"detail": "La fecha de inicio no puede ser en el pasado."}, status=400)
                
            if start_time and end_time and end_time <= start_time:
                return JsonResponse({"detail": "La fecha de fin debe ser posterior a la de inicio."}, status=400)

            # Validar superposición de horarios solo para asistencia
            overlapping_participating = EventParticipation.objects.filter(
                user=request.user,
                event__start_time__lt=end_time,
                event__end_time__gt=start_time
            ).exists()
            
            if overlapping_participating:
                return JsonResponse({"detail": "Ya asistes a otro evento en ese horario."}, status=400)

            event = Event.objects.create(
                title=body.get('title'),
                description=body.get('description'),
                start_time=body.get('start_time'),
                end_time=body.get('end_time'),
                location=body.get('location'),
                image_url=body.get('image_url'),
                tags=body.get('tags'),
                max_participants=body.get('max_participants'),
                residence=request.residence,
                host=request.user
            )
            return JsonResponse({'id': event.id, 'detail': 'Event created successfully'}, status=201)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

class EventDetailView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        is_joined = event.participations.filter(user=request.user).exists()
        can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
        return JsonResponse({
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat(),
            'location': event.location,
            'image_url': event.image_url,
            'tags': event.tags,
            'max_participants': event.max_participants,
            'participants_count': event.participants_count,
            'can_join': event.can_join(),
            'can_edit': can_edit,
            'is_joined': is_joined,
            'host': {
                'id': event.host.id,
                'first_name': event.host.first_name,
                'last_name': event.host.last_name,
            }
        })
        
    def put(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)
            
        try:
            body = json.loads(request.body)
            
            start_time_str = body.get('start_time')
            end_time_str = body.get('end_time')
            
            if not start_time_str or not end_time_str:
                return JsonResponse({"detail": "Se requiere fecha de inicio y fin."}, status=400)
                
            start_time = parse_datetime(start_time_str)
            end_time = parse_datetime(end_time_str)
            
            if start_time and end_time and end_time <= start_time:
                return JsonResponse({"detail": "La fecha de fin debe ser posterior a la de inicio."}, status=400)
                
            # Validar superposición de horarios solo si las fechas cambiaron
            if start_time != event.start_time or end_time != event.end_time:
                # Validar superposición de horarios solo para asistencia
                overlapping_participating = EventParticipation.objects.exclude(event=event).filter(
                    user=request.user,
                    event__start_time__lt=end_time,
                    event__end_time__gt=start_time
                ).exists()
                
                if overlapping_participating:
                    return JsonResponse({"detail": "Ya asistes a otro evento en ese horario."}, status=400)
            
            event.title = body.get('title', event.title)
            event.description = body.get('description', event.description)
            event.start_time = start_time
            event.end_time = end_time
            event.location = body.get('location', event.location)
            event.image_url = body.get('image_url', event.image_url)
            event.tags = body.get('tags', event.tags)
            event.max_participants = body.get('max_participants', event.max_participants)
            
            event.save()
            return JsonResponse({'id': event.id, 'detail': 'Event updated successfully'}, status=200)
        except Exception as e:
            return JsonResponse({"detail": str(e)}, status=400)

    def delete(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        # Check permissions
        can_edit = event.host == request.user or getattr(request.user, 'is_staff', False)
        if not can_edit:
            return JsonResponse({"detail": "Unauthorized"}, status=403)
        event.delete()
        return JsonResponse({"detail": "Event deleted"}, status=200)

class EventJoinView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        
        if not event.can_join():
            return JsonResponse({"detail": "El evento ha alcanzado el límite de participantes."}, status=400)

        # Validar superposición
        overlapping_participating = EventParticipation.objects.exclude(event=event).filter(
            user=request.user,
            event__start_time__lt=event.end_time,
            event__end_time__gt=event.start_time
        ).exists()

        if overlapping_participating:
            return JsonResponse({"detail": "Este evento coincide en horario con otro al que ya asistes."}, status=400)

        try:
            EventParticipation.objects.create(event=event, user=request.user)
            return JsonResponse({"detail": "Te has inscrito correctamente en el evento."}, status=201)
        except IntegrityError:
            return JsonResponse({"detail": "Ya estás inscrito en este evento."}, status=400)

class EventLeaveView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        deleted, _ = EventParticipation.objects.filter(event=event, user=request.user).delete()
        
        if deleted:
            return JsonResponse({"detail": "Has abandonado el evento."}, status=200)
        return JsonResponse({"detail": "No estás inscrito en este evento."}, status=400)

class EventParticipantsView(AuthenticatedView):
    def get(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        participations = event.participations.select_related('user').all()
        data = []
        for p in participations:
            data.append({
                'joined_at': p.joined_at.isoformat(),
                'user': {
                    'id': p.user.id,
                    'first_name': p.user.first_name,
                    'last_name': p.user.last_name,
                }
            })
        return JsonResponse(data, safe=False)
