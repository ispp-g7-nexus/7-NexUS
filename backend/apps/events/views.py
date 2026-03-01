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
            data.append({
                'id': event.id,
                'title': event.title,
                'description': event.description,
                'start_time': event.start_time.isoformat(),
                'end_time': event.end_time.isoformat(),
                'location': event.location,
                'max_participants': event.max_participants,
                'participants_count': event.participants_count,
                'can_join': event.can_join(),
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
            event = Event.objects.create(
                title=body.get('title'),
                description=body.get('description'),
                start_time=body.get('start_time'),
                end_time=body.get('end_time'),
                location=body.get('location'),
                image_url=body.get('image_url'),
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
        return JsonResponse({
            'id': event.id,
            'title': event.title,
            'description': event.description,
            'start_time': event.start_time.isoformat(),
            'end_time': event.end_time.isoformat(),
            'location': event.location,
            'image_url': event.image_url,
            'max_participants': event.max_participants,
            'participants_count': event.participants_count,
            'can_join': event.can_join(),
            'is_joined': is_joined,
            'host': {
                'id': event.host.id,
                'first_name': event.host.first_name,
                'last_name': event.host.last_name,
            }
        })
        
    def delete(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        # Check permissions - simplistic check
        if event.host != request.user:
            return JsonResponse({"detail": "Unauthorized"}, status=403)
        event.delete()
        return JsonResponse({"detail": "Event deleted"}, status=204)

class EventJoinView(AuthenticatedView):
    def post(self, request, event_id):
        event = get_object_or_404(Event, id=event_id, residence=request.residence)
        
        if not event.can_join():
            return JsonResponse({"detail": "El evento ha alcanzado el límite de participantes."}, status=400)

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
