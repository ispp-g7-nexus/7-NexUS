import json
from datetime import timedelta, time
from unittest.mock import patch, MagicMock

from django.test import RequestFactory, Client
from django_tenants.test.cases import FastTenantTestCase
from django.utils import timezone
from django.urls import reverse
from django.contrib.auth import get_user_model
from django.db.utils import IntegrityError
from django.http import JsonResponse

from apps.events.models import Event, EventParticipation
from apps.residences.models import Residence
from apps.spaces.models import CommonSpace, SpaceReservation
from apps.events.views import (
    _normalize_event_type,
    _parse_and_validate_times,
    _serialize_event,
    _create_reservation_through_spaces_module,
    _space_has_active_overlap,
    _parse_max_participants,
    _normalize_internal_event_limit,
)

User = get_user_model()

class BaseTestMixin:
    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Test Residence"
        tenant.slug = "test"
        tenant.code = "test"
        tenant.is_active = True
        return tenant

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = "test.local"
        domain.is_primary = True
        return domain

    def setUp(self):
        super().setUp()
        self.residence = Residence.objects.create(name="Test Residence", slug="test", code="test")
        self.user = User.objects.create_user(username="testuser", email="test@test.com", password="password")
        self.host_user = User.objects.create_user(username="testuser2", email="host@test.com", password="password")
        self.staff_user = User.objects.create_user(username="staff", email="staff@test.com", password="password", is_staff=True)
        
        self.space = CommonSpace.objects.create(
            name="Test Space",
            capacity=10,
            residence=self.residence,
            is_active=True,
            open_time=time(8, 0),
            close_time=time(22, 0)
        )
        self.now = timezone.now()
        
        # We might need a reservation for internal events
        self.reservation = SpaceReservation.objects.create(
            space=self.space,
            residence=self.residence,
            user=self.host_user,
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            status=SpaceReservation.Status.ACTIVE
        )


class EventModelTests(BaseTestMixin, FastTenantTestCase):
    def test_string_representation(self):
        event = Event(title="Test Event")
        self.assertEqual(str(event), "Test Event")
        
    def test_participation_string_representation(self):
        event = Event.objects.create(
            title="P Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="P Loc"
        )
        part = EventParticipation.objects.create(event=event, user=self.user)
        self.assertEqual(str(part), f"{self.user} -> {event}")

    def test_participants_count(self):
        event = Event.objects.create(
            title="P Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="P Loc"
        )
        self.assertEqual(event.participants_count, 0)
        EventParticipation.objects.create(event=event, user=self.user)
        self.assertEqual(event.participants_count, 1)

    def test_can_join_external_unlimited(self):
        event = Event(event_type=Event.Type.EXTERNAL, max_participants=None)
        self.assertTrue(event.can_join())

    def test_can_join_external_limited(self):
        event = Event.objects.create(
            title="L Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="L Loc",
            max_participants=1
        )
        self.assertTrue(event.can_join())
        EventParticipation.objects.create(event=event, user=self.user)
        self.assertFalse(event.can_join())

    def test_can_join_internal_space_limit(self):
        event = Event.objects.create(
            title="I Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.INTERNAL,
            residence=self.residence,
            host=self.host_user,
            space=self.space,
            reservation=self.reservation,
            max_participants=None # Default to capacity (10)
        )
        self.assertTrue(event.can_join())
        event.max_participants = 5
        self.assertTrue(event.can_join())


class HelperFunctionsTests(BaseTestMixin, FastTenantTestCase):
    def test_normalize_event_type(self):
        self.assertEqual(_normalize_event_type("internal"), Event.Type.INTERNAL)
        self.assertEqual(_normalize_event_type("external"), Event.Type.EXTERNAL)
        self.assertEqual(_normalize_event_type(""), Event.Type.EXTERNAL)
        self.assertEqual(_normalize_event_type(None), Event.Type.EXTERNAL)
        self.assertIsNone(_normalize_event_type("invalid"))

    def test_parse_and_validate_times(self):
        # Missing args
        s, e, err = _parse_and_validate_times("", "", validate_future=True)
        self.assertEqual(err.status_code, 400)
        
        # Invalid format
        s, e, err = _parse_and_validate_times("invalid", "times", validate_future=True)
        self.assertEqual(err.status_code, 400)

        now_str = (self.now + timedelta(minutes=10)).isoformat()
        past_str = (self.now - timedelta(hours=1)).isoformat()
        future_str = (self.now + timedelta(hours=1)).isoformat()

        # Past start time
        s, e, err = _parse_and_validate_times(past_str, now_str, validate_future=True)
        self.assertEqual(err.status_code, 400)

        # End before start
        s, e, err = _parse_and_validate_times(future_str, now_str, validate_future=False)
        self.assertEqual(err.status_code, 400)

        # Success naive (if isoformat emits naive, else make it naive)
        naive_start = "2026-05-01T10:00:00"
        naive_end = "2026-05-01T12:00:00"
        s, e, err = _parse_and_validate_times(naive_start, naive_end, validate_future=False)
        self.assertIsNone(err)
        self.assertTrue(timezone.is_aware(s))
        self.assertTrue(timezone.is_aware(e))

    def test_serialize_event(self):
        event = Event.objects.create(
            title="P Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.INTERNAL,
            residence=self.residence,
            host=self.host_user,
            space=self.space,
            reservation=self.reservation,
            location=""
        )
        data = _serialize_event(event, self.user)
        self.assertEqual(data["title"], "P Event")
        self.assertEqual(data["space"]["id"], self.space.id)
        self.assertFalse(data["can_edit"])
        self.assertFalse(data["is_joined"])

        # Edit permission for host
        data_host = _serialize_event(event, self.host_user)
        self.assertTrue(data_host["can_edit"])

    def test_parse_max_participants(self):
        val, err = _parse_max_participants(None)
        self.assertIsNone(val)
        
        val, err = _parse_max_participants("10")
        self.assertEqual(val, 10)
        
        val, err = _parse_max_participants("abc")
        self.assertEqual(err.status_code, 400)
        
        val, err = _parse_max_participants("-5")
        self.assertEqual(err.status_code, 400)

    def test_normalize_internal_event_limit(self):
        # Good limit
        val, err = _normalize_internal_event_limit("5", 10)
        self.assertEqual(val, 5)

        # No limit string
        val, err = _normalize_internal_event_limit(None, 10)
        self.assertEqual(val, 10)

        # Limit exceeds capacity
        val, err = _normalize_internal_event_limit("15", 10)
        self.assertEqual(err.status_code, 400)

    @patch('apps.events.views.SpaceReservationCreateView.post')
    def test_create_reservation_through_spaces_module(self, mock_post):
        rf = RequestFactory()
        req = rf.post('/')
        req.user = self.user
        
        # Mock failed reservation
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.content = b'{"detail": "Error"}'
        mock_post.return_value = mock_response

        res, err = _create_reservation_through_spaces_module(
            request=req,
            residence=self.residence,
            space_id=self.space.id,
            start_time=self.now,
            end_time=self.now + timedelta(hours=1)
        )
        self.assertIsNone(res)
        self.assertIsNotNone(err)
        self.assertEqual(err.status_code, 400)

        # Mock success response
        mock_response.status_code = 201
        # Create an actual reservation for it to retrieve
        test_resv = SpaceReservation.objects.create(
            space=self.space,
            residence=self.residence,
            user=self.user,
            start_time=self.now,
            end_time=self.now + timedelta(hours=1),
            status=SpaceReservation.Status.ACTIVE
        )
        mock_response.content = json.dumps({"id": test_resv.id}).encode('utf-8')
        mock_post.return_value = mock_response

        res, err = _create_reservation_through_spaces_module(
            request=req,
            residence=self.residence,
            space_id=self.space.id,
            start_time=self.now,
            end_time=self.now + timedelta(hours=1)
        )
        self.assertIsNone(err)
        self.assertEqual(res.id, test_resv.id)

        # Mock missing DB reservation despite 201
        test_resv.delete()
        mock_response.content = b'{"id": 9999}'
        res, err = _create_reservation_through_spaces_module(
            request=req,
            residence=self.residence,
            space_id=self.space.id,
            start_time=self.now,
            end_time=self.now + timedelta(hours=1)
        )
        self.assertIsNotNone(err)

    def test_space_has_active_overlap(self):
        res = _space_has_active_overlap(
            residence=self.residence,
            space_id=self.space.id,
            start_time=self.reservation.start_time,
            end_time=self.reservation.end_time
        )
        self.assertTrue(res)

        # Exclude self
        res_exclude = _space_has_active_overlap(
            residence=self.residence,
            space_id=self.space.id,
            start_time=self.reservation.start_time,
            end_time=self.reservation.end_time,
            exclude_reservation_id=self.reservation.id
        )
        self.assertFalse(res_exclude)

    @patch('apps.events.views.SpaceReservationCreateView.post')
    def test_create_reservation_parsing_error(self, mock_post):
        mock_response = MagicMock()
        mock_response.status_code = 400
        mock_response.content = b"not valid json"
        mock_post.return_value = mock_response

        req = RequestFactory().post('/')
        req.user = self.user
        res, error = _create_reservation_through_spaces_module(
            request=req, residence=self.residence, space_id=self.space.id, start_time=self.now, end_time=self.now + timedelta(hours=1)
        )
        self.assertIsNone(res)
        self.assertEqual(error.status_code, 400)

    def test_normalize_internal_event_limit_invalid(self):
        val, err = _normalize_internal_event_limit(-1, 50)
        self.assertIsNone(val)
        self.assertEqual(err.status_code, 400)

class ViewTestsBase(BaseTestMixin, FastTenantTestCase):
    def setUp(self):
        super().setUp()
        self.rf = RequestFactory()
        
    def setup_request(self, request, user=None, residence=None, attach_residence=True):
        request.user = user or self.user
        if attach_residence:
            request.residence = residence or self.residence
        return request

class AuthenticatedViewTest(ViewTestsBase):
    @patch('apps.events.views.resolve_user_from_request')
    def test_dispatch_unauthenticated(self, mock_resolve):
        from apps.events.views import AuthenticatedView
        
        # Missing auth
        mock_resolve.return_value = None
        req = self.rf.get('/')
        from django.contrib.auth.models import AnonymousUser
        req.user = AnonymousUser()
        res = AuthenticatedView.as_view()(req)
        self.assertEqual(res.status_code, 401)
        
        # Mock valid resolve
        mock_resolve.return_value = {'id': self.user.id}
        req2 = self.rf.get('/')
        req2.user = AnonymousUser()
        res2 = AuthenticatedView.as_view()(req2)
        # Should proceed to dispatch and hit the View default NotImplemented or 405
        self.assertEqual(res2.status_code, 405)

        # Mock resolve but user not found
        mock_resolve.return_value = {'id': 99999}
        req3 = self.rf.get('/')
        req3.user = AnonymousUser()
        res3 = AuthenticatedView.as_view()(req3)
        self.assertEqual(res3.status_code, 401)

class EventListViewTests(ViewTestsBase):
    from apps.events.views import EventListView
    
    def test_get_events(self):
        from apps.events.views import EventListView
        Event.objects.create(
            title="List Event",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="Somewhere"
        )
        
        req = self.setup_request(self.rf.get('/'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.content)
        self.assertTrue(len(data) >= 1)

        req_no_res = self.setup_request(self.rf.get('/'), attach_residence=False)
        res_no = EventListView.as_view()(req_no_res)
        self.assertEqual(res_no.status_code, 400)

    def test_post_no_residence(self):
        from apps.events.views import EventListView
        req = self.setup_request(self.rf.post('/'), attach_residence=False)
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    def test_post_invalid_event_type(self):
        from apps.events.views import EventListView
        req = self.setup_request(self.rf.post('/', data=json.dumps({'event_type': 'invalid'}), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Tipo de evento inválido", json.loads(res.content).get('detail', ''))

    def test_post_invalid_times(self):
        from apps.events.views import EventListView
        payload = {
            'event_type': 'external',
            'start_time': '',
            'end_time': ''
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    def test_post_overlap_participating(self):
        from apps.events.views import EventListView
        e1 = Event.objects.create(
            title="E1",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="Loc"
        )
        EventParticipation.objects.create(event=e1, user=self.user)
        payload = {
            'event_type': 'external',
            'start_time': (self.now + timedelta(hours=1)).isoformat(),
            'end_time': (self.now + timedelta(hours=1, minutes=30)).isoformat(),
            'location': 'New Loc'
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Ya asistes a otro evento", json.loads(res.content).get('detail', ''))

    def test_post_internal_validations(self):
        from apps.events.views import EventListView
        # Missing space
        payload1 = {
            'event_type': 'internal',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
        }
        req1 = self.setup_request(self.rf.post('/', data=json.dumps(payload1), content_type='application/json'))
        res1 = EventListView.as_view()(req1)
        self.assertEqual(res1.status_code, 400)
        
        # With external location
        payload2 = payload1.copy()
        payload2['space_id'] = self.space.id
        payload2['location'] = 'Outside'
        req2 = self.setup_request(self.rf.post('/', data=json.dumps(payload2), content_type='application/json'))
        res2 = EventListView.as_view()(req2)
        self.assertEqual(res2.status_code, 400)

    def test_post_external_validations(self):
        from apps.events.views import EventListView
        # Missing location
        payload1 = {
            'event_type': 'external',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
        }
        req1 = self.setup_request(self.rf.post('/', data=json.dumps(payload1), content_type='application/json'))
        res1 = EventListView.as_view()(req1)
        self.assertEqual(res1.status_code, 400)
        
        # With space
        payload2 = payload1.copy()
        payload2['location'] = 'Loc'
        payload2['space_id'] = self.space.id
        req2 = self.setup_request(self.rf.post('/', data=json.dumps(payload2), content_type='application/json'))
        res2 = EventListView.as_view()(req2)
        self.assertEqual(res2.status_code, 400)

    @patch('apps.events.views._create_reservation_through_spaces_module')
    @patch('apps.events.views._space_has_active_overlap')
    def test_post_internal_success(self, mock_overlap, mock_res):
        from apps.events.views import EventListView
        mock_overlap.return_value = False
        mock_res.return_value = (self.reservation, None)

        payload = {
            'title': 'New Internal',
            'description': 'desc',
            'event_type': 'internal',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
            'space_id': self.space.id,
            'max_participants': 5
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        if res.status_code != 201: print("DEBUG:", res.content.decode('utf-8'))
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.content)
        e = Event.objects.get(id=data['id'])
        self.assertEqual(e.title, 'New Internal')
        
    def test_post_internal_space_overlap(self):
        from apps.events.views import EventListView
        payload = {
            'title': 'New Internal',
            'event_type': 'internal',
            'start_time': self.reservation.start_time.isoformat(),
            'end_time': self.reservation.end_time.isoformat(),
            'space_id': self.space.id,
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    def test_post_external_success(self):
        from apps.events.views import EventListView
        payload = {
            'title': 'New External',
            'description': 'desc',
            'event_type': 'external',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
            'location': 'Beach',
            'max_participants': 10
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        if res.status_code != 201: print("DEBUG:", res.content.decode('utf-8'))
        self.assertEqual(res.status_code, 201)
        data = json.loads(res.content)
        self.assertTrue('id' in data)

    def test_post_exception_handling(self):
        from apps.events.views import EventListView
        payload = "invalid json"
        req = self.setup_request(self.rf.post('/', data=payload, content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    def test_post_internal_limit_error(self):
        from apps.events.views import EventListView
        payload = {
            'title': 'E', 'description': 'd', 'event_type': 'internal',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
            'space_id': self.space.id, 'max_participants': -1
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    @patch('apps.events.views._create_reservation_through_spaces_module')
    @patch('apps.events.views._space_has_active_overlap')
    def test_post_internal_reservation_error(self, mock_overlap, mock_res):
        from apps.events.views import EventListView
        mock_overlap.return_value = False
        mock_res.return_value = (None, JsonResponse({"detail": "err"}, status=400))
        payload = {
            'title': 'E', 'description': 'd', 'event_type': 'internal',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
            'space_id': self.space.id
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

    def test_post_external_limit_error(self):
        from apps.events.views import EventListView
        payload = {
            'title': 'E', 'description': 'd', 'event_type': 'external',
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
            'location': 'Beach', 'max_participants': -1
        }
        req = self.setup_request(self.rf.post('/', data=json.dumps(payload), content_type='application/json'))
        res = EventListView.as_view()(req)
        self.assertEqual(res.status_code, 400)

class EventDetailViewTests(ViewTestsBase):
    from apps.events.views import EventDetailView
    
    def setUp(self):
        super().setUp()
        self.event_ext = Event.objects.create(
            title="Detail Ext",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="Loc"
        )
        self.event_int = Event.objects.create(
            title="Detail Int",
            start_time=self.now + timedelta(hours=4),
            end_time=self.now + timedelta(hours=5),
            event_type=Event.Type.INTERNAL,
            residence=self.residence,
            host=self.host_user,
            space=self.space,
            reservation=self.reservation
        )
        
    def test_get_event(self):
        from apps.events.views import EventDetailView
        req = self.setup_request(self.rf.get('/'))
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 200)

    def test_put_unauthorized(self):
        from apps.events.views import EventDetailView
        # user is not host or staff
        req = self.setup_request(self.rf.put('/'))
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 403)

    def test_put_update_times_overlap(self):
        from apps.events.views import EventDetailView
        # Another event for the host that they are joining
        e2 = Event.objects.create(
            title="E2",
            start_time=self.now + timedelta(hours=3),
            end_time=self.now + timedelta(hours=4),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="L"
        )
        EventParticipation.objects.create(event=e2, user=self.host_user)

        payload = {
            'start_time': (self.now + timedelta(hours=3)).isoformat(),
            'end_time': (self.now + timedelta(hours=4)).isoformat(),
        }
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Ya asistes a otro evento", json.loads(res.content).get('detail', ''))

    def test_put_update_external_location_missing(self):
        from apps.events.views import EventDetailView
        payload = {
            'location': '',
            'start_time': self.event_ext.start_time.isoformat(),
            'end_time': self.event_ext.end_time.isoformat(),
        }
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 400)
    
    def test_put_update_participants_too_low(self):
        from apps.events.views import EventDetailView
        EventParticipation.objects.create(event=self.event_ext, user=self.host_user)
        EventParticipation.objects.create(event=self.event_ext, user=self.user)
        # Event has 2 participants. Cannot set max to 1
        payload = {
            'max_participants': 1,
            'start_time': self.event_ext.start_time.isoformat(),
            'end_time': self.event_ext.end_time.isoformat(),
        }
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("límite", json.loads(res.content).get('detail', '').lower())

    @patch('apps.events.views._create_reservation_through_spaces_module')
    @patch('apps.events.views._space_has_active_overlap')
    def test_put_update_internal_change_time(self, mock_overlap, mock_res):
        from apps.events.views import EventDetailView
        mock_overlap.return_value = False
        # mock returns a new reservation
        new_res = SpaceReservation.objects.create(
            space=self.space,
            residence=self.residence,
            user=self.host_user,
            start_time=self.now + timedelta(hours=6),
            end_time=self.now + timedelta(hours=7),
            status=SpaceReservation.Status.ACTIVE
        )
        mock_res.return_value = (new_res, None)

        payload = {
            'start_time': (self.now + timedelta(hours=6)).isoformat(),
            'end_time': (self.now + timedelta(hours=7)).isoformat(),
            'space_id': self.space.id
        }
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_int.id)
        if res.status_code != 200: print("DEBUG:", res.content.decode('utf-8'))
        self.assertEqual(res.status_code, 200)

        # Check the old reservation was cancelled and deleted
        # Since it was deleted, we can't fetch it, but we can verify the event reservation id is new_res
        self.event_int.refresh_from_db()
        self.assertEqual(self.event_int.reservation_id, new_res.id)

    def test_delete_unauthorized(self):
        from apps.events.views import EventDetailView
        req = self.setup_request(self.rf.delete('/'))
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 403)

    def test_delete_success(self):
        from apps.events.views import EventDetailView
        req = self.setup_request(self.rf.delete('/'), user=self.staff_user) # staff can delete
        res = EventDetailView.as_view()(req, event_id=self.event_int.id)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(Event.objects.filter(id=self.event_int.id).exists())
        self.assertFalse(SpaceReservation.objects.filter(id=self.reservation.id).exists())

    def test_put_invalid_event_type(self):
        from apps.events.views import EventDetailView
        payload = {'event_type': 'invalid', 'start_time': (self.now + timedelta(hours=1)).isoformat(), 'end_time': (self.now + timedelta(hours=2)).isoformat()}
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 400)

    def test_put_invalid_times(self):
        from apps.events.views import EventDetailView
        req = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': 'abc', 'end_time': 'abc'}), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_ext.id)
        self.assertEqual(res.status_code, 400)

    def test_put_internal_errors(self):
        from apps.events.views import EventDetailView
        req1 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'space_id': ''}), content_type='application/json'), user=self.host_user)
        res1 = EventDetailView.as_view()(req1, event_id=self.event_int.id)
        self.assertEqual(res1.status_code, 400)

        req2 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'location': 'Outside'}), content_type='application/json'), user=self.host_user)
        res2 = EventDetailView.as_view()(req2, event_id=self.event_int.id)
        self.assertEqual(res2.status_code, 400)

        req3 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'max_participants': -1}), content_type='application/json'), user=self.host_user)
        res3 = EventDetailView.as_view()(req3, event_id=self.event_int.id)
        self.assertEqual(res3.status_code, 400)

    @patch('apps.events.views._space_has_active_overlap')
    def test_put_internal_space_overlap(self, mock_overlap):
        from apps.events.views import EventDetailView
        mock_overlap.return_value = True
        req = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=6)).isoformat(), 'end_time': (self.now + timedelta(hours=7)).isoformat()}), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_int.id)
        self.assertEqual(res.status_code, 400)

    @patch('apps.events.views._space_has_active_overlap')
    @patch('apps.events.views._create_reservation_through_spaces_module')
    def test_put_internal_reservation_creation_error(self, mock_res, mock_overlap):
        from apps.events.views import EventDetailView
        mock_overlap.return_value = False
        mock_res.return_value = (None, JsonResponse({"detail": "err"}, status=400))
        req = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=6)).isoformat(), 'end_time': (self.now + timedelta(hours=7)).isoformat()}), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=self.event_int.id)
        self.assertEqual(res.status_code, 400)

    def test_put_external_errors(self):
        from apps.events.views import EventDetailView
        e = Event.objects.create(
            title="E", description="d", start_time=self.now + timedelta(hours=4),
            end_time=self.now + timedelta(hours=5), event_type=Event.Type.EXTERNAL,
            residence=self.residence, host=self.host_user, location="Loc"
        )
        e.location = ""
        e.save()
        req1 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'location': ''}), content_type='application/json'), user=self.host_user)
        res1 = EventDetailView.as_view()(req1, event_id=e.id)
        self.assertEqual(res1.status_code, 400)

        e.location = "Loc"
        e.save()
        req2 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'space_id': self.space.id}), content_type='application/json'), user=self.host_user)
        res2 = EventDetailView.as_view()(req2, event_id=e.id)
        self.assertEqual(res2.status_code, 400)

        req3 = self.setup_request(self.rf.put('/', data=json.dumps({'start_time': (self.now + timedelta(hours=4)).isoformat(), 'end_time': (self.now + timedelta(hours=5)).isoformat(), 'max_participants': -1}), content_type='application/json'), user=self.host_user)
        res3 = EventDetailView.as_view()(req3, event_id=e.id)
        self.assertEqual(res3.status_code, 400)

    def test_put_exception(self):
        from apps.events.views import EventDetailView
        e = Event.objects.create(
            title="E", description="d", start_time=self.now + timedelta(hours=4),
            end_time=self.now + timedelta(hours=5), event_type=Event.Type.EXTERNAL,
            residence=self.residence, host=self.host_user, location="Loc"
        )
        req = self.setup_request(self.rf.put('/', data="invalid json", content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=e.id)
        self.assertEqual(res.status_code, 400)

    @patch('apps.events.views.get_object_or_404')
    def test_put_internal_no_reservation_id_mocked(self, mock_get_obj):
        from apps.events.views import EventDetailView
        from apps.events.models import Event
        from unittest.mock import PropertyMock

        mock_event = MagicMock()
        mock_event.event_type = Event.Type.INTERNAL
        mock_event.space_id = self.space.id
        mock_event.start_time = self.now + timedelta(hours=4)
        mock_event.end_time = self.now + timedelta(hours=5)
        mock_event.participants_count = 0
        mock_event.max_participants = 10
        mock_event.location = ""
        
        # Simulate host user matches exactly
        mock_event.host = self.host_user
        
        # We need `event.reservation_id` to evaluate to True the first time (inside needs_new_reservation)
        # and to False the second time (in elif not event.reservation_id)
        type(mock_event).reservation_id = PropertyMock(side_effect=[True, False])

        def get_obj_se(model, *args, **kwargs):
            if model == Event:
                return mock_event
            return self.space

        mock_get_obj.side_effect = get_obj_se

        payload = {
            'start_time': (self.now + timedelta(hours=4)).isoformat(),
            'end_time': (self.now + timedelta(hours=5)).isoformat(),
            'space_id': self.space.id,
            'max_participants': 10
        }
        
        req = self.setup_request(self.rf.put('/', data=json.dumps(payload), content_type='application/json'), user=self.host_user)
        res = EventDetailView.as_view()(req, event_id=999)
        self.assertEqual(res.status_code, 400)
        self.assertIn("El evento interno debe tener una reserva asociada.", res.content.decode())

class EventJoinLeaveParticipantsViewTests(ViewTestsBase):
    def setUp(self):
        super().setUp()
        self.event = Event.objects.create(
            title="E",
            start_time=self.now + timedelta(hours=1),
            end_time=self.now + timedelta(hours=2),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="Loc"
        )

    def test_join_staff(self):
        from apps.events.views import EventJoinView
        req = self.setup_request(self.rf.post('/'), user=self.staff_user)
        res = EventJoinView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 403)

    def test_join_capacity_full(self):
        from apps.events.views import EventJoinView
        self.event.max_participants = 1
        self.event.save()
        EventParticipation.objects.create(event=self.event, user=self.host_user)
        
        req = self.setup_request(self.rf.post('/'))
        res = EventJoinView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("alcanzado el límite", json.loads(res.content).get('detail', ''))

    def test_join_overlap(self):
        from apps.events.views import EventJoinView
        # user already participating in overlapping event
        e2 = Event.objects.create(
            title="E2",
            start_time=self.now + timedelta(hours=1, minutes=30),
            end_time=self.now + timedelta(hours=2, minutes=30),
            event_type=Event.Type.EXTERNAL,
            residence=self.residence,
            host=self.host_user,
            location="Loc2"
        )
        EventParticipation.objects.create(event=e2, user=self.user)

        req = self.setup_request(self.rf.post('/'))
        res = EventJoinView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 400)
        self.assertIn("coincide en horario", json.loads(res.content).get('detail', ''))

    def test_join_success_and_duplicate(self):
        from apps.events.views import EventJoinView
        req = self.setup_request(self.rf.post('/'))
        res = EventJoinView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 201)
        
        # Join again
        res2 = EventJoinView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res2.status_code, 400)
        self.assertIn("Ya estás inscrito", json.loads(res2.content).get('detail', ''))

    def test_leave_event(self):
        from apps.events.views import EventLeaveView
        EventParticipation.objects.create(event=self.event, user=self.user)
        
        req = self.setup_request(self.rf.post('/'))
        res = EventLeaveView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 200)

        # Leave again
        res2 = EventLeaveView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res2.status_code, 400)

    def test_participants(self):
        from apps.events.views import EventParticipantsView
        EventParticipation.objects.create(event=self.event, user=self.user)
        
        req = self.setup_request(self.rf.get('/'))
        res = EventParticipantsView.as_view()(req, event_id=self.event.id)
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['user']['id'], self.user.id)

class UrlsTests(FastTenantTestCase):
    def test_urls_resolve(self):
        from django.urls import resolve
        self.assertEqual(resolve('/api/events/').url_name, 'event-list')
        self.assertEqual(resolve('/api/events/1/').url_name, 'event-detail')
        self.assertEqual(resolve('/api/events/1/join/').url_name, 'event-join')
        self.assertEqual(resolve('/api/events/1/leave/').url_name, 'event-leave')
        self.assertEqual(resolve('/api/events/1/participants/').url_name, 'event-participants')


