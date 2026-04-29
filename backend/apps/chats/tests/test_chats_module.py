import json
from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from rest_framework.exceptions import NotFound, ValidationError

from apps.chats import realtime
from apps.chats.models import ChatGroup, ChatGroupLabel, ChatGroupMember, GroupMessage, PrivateConversation, PrivateMessage
from apps.chats.permissions import IsAuthenticatedResident, IsChatGroupManager, IsResidenceAdmin
from apps.chats.serializers import AddChatMemberSerializer, ChatGroupCreateUpdateSerializer, ChatGroupLabelSerializer, ChatGroupSerializer, PrivateConversationSerializer, SendMessageSerializer, StartConversationSerializer
from apps.chats.views import MyGroupsViewSet, PrivateConversationViewSet
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain

TEST_PASSWORD = "demo1234"  # NOSONAR


class ChatsModuleTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "chats.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Chats Test"
        tenant.slug = "tenant-chats-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.admin_user = user_model.objects.create_user(
            username="admin-chat",
            email="admin@chats.test",
            password=TEST_PASSWORD,
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student-chat",
            email="student@chats.test",
            password=TEST_PASSWORD,
        )
        self.student_two_user = user_model.objects.create_user(
            username="student-two-chat",
            email="student2@chats.test",
            password=TEST_PASSWORD,
        )
        self.no_membership_user = user_model.objects.create_user(
            username="outsider-chat",
            email="outsider@chats.test",
            password=TEST_PASSWORD,
        )

        self.residence = Residence.objects.create(
            name="Residence Chats",
            slug="res-chats",
            code="RCH-1",
            timezone="Europe/Madrid",
            is_active=True,
        )

        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.admin_role, _ = Role.objects.get_or_create(
            name="Admin",
            residence=None,
            defaults={
                "description": "Administrator",
                "is_system_default": True,
            },
        )
        self.student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={
                "description": "Student",
                "is_system_default": True,
            },
        )

        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )
        self.student_membership = Membership.objects.create(
            user=self.student_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )
        self.student_two_membership = Membership.objects.create(
            user=self.student_two_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )

        self.group = ChatGroup.objects.create(
            residence=self.residence,
            name="General",
            description="General chat",
            label=ChatGroup.LabelChoices.GENERAL,
            can_members_leave=True,
            created_by=self.admin_user,
        )
        self.admin_group_member = ChatGroupMember.objects.create(
            group=self.group,
            membership=self.admin_membership,
            is_admin=True,
            can_interact=True,
        )

        self.admin_client = self._auth_client(self.admin_user)
        self.student_client = self._auth_client(self.student_user)
        self.outsider_client = self._auth_client(self.no_membership_user)

        self.anon_client = TenantClient(self.tenant)
        self.anon_client.defaults["HTTP_HOST"] = self.get_test_tenant_domain()

    def _url(self, path):
        return f"/api/chats{path}"

    def _auth_client(self, user):
        client = TenantClient(self.tenant)
        client.defaults["HTTP_HOST"] = self.get_test_tenant_domain()
        token, _ = build_access_token(user, self.tenant, self.residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def _add_student_to_group(self, membership=None, is_admin=False):
        return ChatGroupMember.objects.create(
            group=self.group,
            membership=membership or self.student_membership,
            is_admin=is_admin,
            can_interact=True,
        )

    # Model

    def test_get_or_create_private_conversation_normalizes_members(self):
        conv_1, created_1 = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_two_membership,
            member_b=self.student_membership,
        )

        conv_2, created_2 = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )

        self.assertTrue(created_1)
        self.assertFalse(created_2)
        self.assertEqual(conv_1.id, conv_2.id)
        self.assertLess(conv_1.member_one_id, conv_1.member_two_id)

    def test_models_string_representations(self):
        label = ChatGroupLabel.objects.create(residence=self.residence, name="etiqueta")
        group_message = GroupMessage.objects.create(
            group=self.group,
            sender=self.admin_membership,
            content="mensaje",
        )
        private_conversation, _ = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )
        private_message = PrivateMessage.objects.create(
            conversation=private_conversation,
            sender=self.student_membership,
            content="privado",
        )

        self.assertEqual(str(self.group), "General")
        self.assertIn(":", str(self.admin_group_member))
        self.assertEqual(str(label), "etiqueta")
        self.assertIn("Msg", str(group_message))
        self.assertIn("Conversación", str(private_conversation))
        self.assertIn("Msg", str(private_message))

    # Views

    def test_chat_group_list(self):
        response = self.admin_client.get(self._url("/groups/"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_chat_group_create(self):
        payload = {
            "name": "Study Group",
            "description": "Exam prep",
            "label": "activity",
            "can_members_leave": True,
        }

        response = self.admin_client.post(self._url("/groups/"), payload, content_type="application/json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(ChatGroup.objects.filter(name="Study Group", residence=self.residence).count(), 1)

    def test_chat_group_update(self):
        response = self.admin_client.patch(
            self._url(f"/groups/{self.group.id}/"),
            data=json.dumps({"description": "Updated description"}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.group.refresh_from_db()
        self.assertEqual(self.group.description, "Updated description")

    def test_chat_group_delete(self):
        group = ChatGroup.objects.create(
            residence=self.residence,
            name="Delete me",
            description="tmp",
            label=ChatGroup.LabelChoices.GENERAL,
            can_members_leave=True,
            created_by=self.admin_user,
        )
        ChatGroupMember.objects.create(
            group=group,
            membership=self.admin_membership,
            is_admin=True,
            can_interact=True,
        )

        response = self.admin_client.delete(self._url(f"/groups/{group.id}/"))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(ChatGroup.objects.filter(id=group.id).exists())

    def test_chat_group_add_member(self):
        payload = {
            "email": self.student_user.email,
            "is_admin": False,
        }

        response = self.admin_client.post(
            self._url(f"/groups/{self.group.id}/members/"),
            payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertTrue(
            ChatGroupMember.objects.filter(group=self.group, membership=self.student_membership, can_interact=True).exists()
        )

    def test_chat_group_update_member_role(self):
        member = self._add_student_to_group()

        response = self.admin_client.patch(
            self._url(f"/groups/{self.group.id}/members/{member.id}/"),
            data='{"is_admin": true}',
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        member.refresh_from_db()
        self.assertTrue(member.is_admin)

    def test_chat_group_add_existing_active_member_returns_400(self):
        self._add_student_to_group()

        response = self.admin_client.post(
            self._url(f"/groups/{self.group.id}/members/"),
            {"email": self.student_user.email, "is_admin": False},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_chat_group_update_member_cannot_demote_creator(self):
        response = self.admin_client.patch(
            self._url(f"/groups/{self.group.id}/members/{self.admin_group_member.id}/"),
            data=json.dumps({"is_admin": False}),
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_chat_group_remove_member_soft_disables_member(self):
        member = self._add_student_to_group()

        response = self.admin_client.delete(self._url(f"/groups/{self.group.id}/members/{member.id}/"))

        self.assertEqual(response.status_code, 204)
        member.refresh_from_db()
        self.assertFalse(member.can_interact)
        self.assertFalse(member.is_admin)
        self.assertIsNotNone(member.interaction_disabled_at)

    def test_chat_group_remove_creator_forbidden(self):
        response = self.admin_client.delete(self._url(f"/groups/{self.group.id}/members/{self.admin_group_member.id}/"))
        self.assertEqual(response.status_code, 400)

    def test_my_groups_list(self):
        self._add_student_to_group()

        response = self.student_client.get(self._url("/my-groups/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_my_group_leave(self):
        self._add_student_to_group()

        response = self.student_client.post(self._url(f"/my-groups/{self.group.id}/leave/"))

        self.assertEqual(response.status_code, 204)
        self.assertFalse(
            ChatGroupMember.objects.filter(group=self.group, membership=self.student_membership).exists()
        )

    def test_my_group_leave_not_allowed(self):
        self.group.can_members_leave = False
        self.group.save(update_fields=["can_members_leave"])
        self._add_student_to_group()

        response = self.student_client.post(self._url(f"/my-groups/{self.group.id}/leave/"))

        self.assertEqual(response.status_code, 400)

    def test_my_group_messages_get(self):
        self._add_student_to_group()
        GroupMessage.objects.create(
            group=self.group,
            sender=self.student_membership,
            content="Hola grupo",
        )

        response = self.student_client.get(self._url(f"/my-groups/{self.group.id}/messages/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["content"], "Hola grupo")

    def test_my_group_messages_post(self):
        self._add_student_to_group()

        response = self.student_client.post(
            self._url(f"/my-groups/{self.group.id}/messages/"),
            data={"content": "Mensaje nuevo"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(GroupMessage.objects.filter(group=self.group).count(), 1)

    def test_my_group_messages_post_forbidden_when_cannot_interact(self):
        member = self._add_student_to_group()
        member.can_interact = False
        member.save(update_fields=["can_interact"])

        response = self.student_client.post(
            self._url(f"/my-groups/{self.group.id}/messages/"),
            data={"content": "No deberia enviarse"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_my_group_messages_post_rejects_blank_content(self):
        self._add_student_to_group()

        response = self.student_client.post(
            self._url(f"/my-groups/{self.group.id}/messages/"),
            data={"content": "   "},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_chat_labels_crud_admin(self):
        create_response = self.admin_client.post(
            self._url("/labels/"),
            data={"name": "sports"},
            content_type="application/json",
        )
        self.assertEqual(create_response.status_code, 201)

        label_id = create_response.json()["id"]

        list_response = self.admin_client.get(self._url("/labels/"))
        self.assertEqual(list_response.status_code, 200)
        self.assertEqual(len(list_response.json()), 1)

        patch_response = self.admin_client.patch(
            self._url(f"/labels/{label_id}/"),
            data=json.dumps({"name": "wellness"}),
            content_type="application/json",
        )
        self.assertEqual(patch_response.status_code, 200)

        delete_response = self.admin_client.delete(self._url(f"/labels/{label_id}/"))
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(ChatGroupLabel.objects.filter(id=label_id).exists())

    def test_chat_labels_duplicate_name_returns_400(self):
        ChatGroupLabel.objects.create(residence=self.residence, name="gaming")

        response = self.admin_client.post(
            self._url("/labels/"),
            data={"name": "Gaming"},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_private_conversation_start(self):
        payload = {
            "membership_id": self.student_two_membership.id,
        }

        response = self.student_client.post(
            self._url("/conversations/start/"),
            data=payload,
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertTrue(
            PrivateConversation.objects.filter(
                residence=self.residence,
                member_one_id=min(self.student_membership.id, self.student_two_membership.id),
                member_two_id=max(self.student_membership.id, self.student_two_membership.id),
            ).exists()
        )

    def test_private_conversation_messages_post_and_get(self):
        conv, _ = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )
        PrivateMessage.objects.create(
            conversation=conv,
            sender=self.student_two_membership,
            content="Mensaje previo",
            is_read=False,
        )

        post_response = self.student_client.post(
            self._url(f"/conversations/{conv.id}/messages/"),
            data={"content": "Respuesta"},
            content_type="application/json",
        )
        self.assertEqual(post_response.status_code, 201)

        get_response = self.student_client.get(self._url(f"/conversations/{conv.id}/messages/"))
        self.assertEqual(get_response.status_code, 200)
        self.assertEqual(len(get_response.json()), 2)

        unread_from_other = PrivateMessage.objects.filter(
            conversation=conv,
            sender=self.student_two_membership,
            is_read=False,
        ).count()
        self.assertEqual(unread_from_other, 0)

    def test_private_conversation_list(self):
        PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )

        response = self.student_client.get(self._url("/conversations/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()), 1)

    def test_private_conversation_retrieve_marks_messages_as_read(self):
        conv, _ = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )
        msg = PrivateMessage.objects.create(
            conversation=conv,
            sender=self.student_two_membership,
            content="Nuevo",
            is_read=False,
        )

        response = self.student_client.get(self._url(f"/conversations/{conv.id}/"))

        self.assertEqual(response.status_code, 200)
        msg.refresh_from_db()
        self.assertTrue(msg.is_read)

    def test_private_conversation_start_with_self_returns_400(self):
        response = self.student_client.post(
            self._url("/conversations/start/"),
            data={"membership_id": self.student_membership.id},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_private_conversation_start_with_nonexistent_membership_returns_400(self):
        response = self.student_client.post(
            self._url("/conversations/start/"),
            data={"membership_id": 999999},
            content_type="application/json",
        )

        self.assertEqual(response.status_code, 400)

    def test_chat_residents_list(self):
        response = self.student_client.get(self._url("/residents/"))

        self.assertEqual(response.status_code, 200)
        emails = {item["email"] for item in response.json()}
        self.assertIn(self.student_two_user.email, emails)
        self.assertNotIn(self.student_user.email, emails)

    # Unit branches

    def test_permissions_unit_branches(self):
        is_admin = IsResidenceAdmin()
        is_manager = IsChatGroupManager()
        is_resident = IsAuthenticatedResident()

        anonymous = SimpleNamespace(is_authenticated=False)
        request_anon = SimpleNamespace(user=anonymous, residence=self.residence)
        self.assertFalse(is_admin.has_permission(request_anon, SimpleNamespace()))
        self.assertFalse(is_manager.has_permission(request_anon, SimpleNamespace(action="list")))
        self.assertFalse(is_resident.has_permission(request_anon, SimpleNamespace()))

        request_no_residence = SimpleNamespace(user=self.admin_user, residence=None)
        self.assertFalse(is_admin.has_permission(request_no_residence, SimpleNamespace()))
        self.assertFalse(is_manager.has_permission(request_no_residence, SimpleNamespace(action="list")))
        self.assertFalse(is_resident.has_permission(request_no_residence, SimpleNamespace()))

        request_student = SimpleNamespace(user=self.student_user, residence=self.residence)
        self.assertFalse(is_manager.has_permission(request_student, SimpleNamespace(action="create")))
        self.assertTrue(is_manager.has_permission(request_student, SimpleNamespace(action="list")))

    def test_serializers_unit_branches(self):
        label_serializer = ChatGroupLabelSerializer(context={})
        self.assertEqual(label_serializer.validate_name("  social  "), "social")
        with self.assertRaises(Exception):
            label_serializer.validate_name("   ")

        group_serializer = ChatGroupCreateUpdateSerializer(context={})
        self.assertEqual(group_serializer.validate_name("  Grupo  "), "Grupo")
        with self.assertRaises(Exception):
            group_serializer.validate_name("   ")

        request_ctx = SimpleNamespace(residence=self.residence)
        add_member_serializer = AddChatMemberSerializer(context={"request": request_ctx})
        with self.assertRaises(Exception):
            add_member_serializer.validate_email("not-found@chats.test")
        with self.assertRaises(Exception):
            add_member_serializer.validate_email(self.no_membership_user.email)

        chat_serializer = ChatGroupSerializer(context={})
        self.assertTrue(chat_serializer.get_current_user_can_interact(self.group))

        req_without_membership = SimpleNamespace(user=self.no_membership_user, residence=self.residence)
        chat_serializer = ChatGroupSerializer(context={"request": req_without_membership})
        self.assertFalse(chat_serializer.get_current_user_can_interact(self.group))

        req_not_in_group = SimpleNamespace(user=self.student_two_user, residence=self.residence)
        chat_serializer = ChatGroupSerializer(context={"request": req_not_in_group})
        self.assertFalse(chat_serializer.get_current_user_can_interact(self.group))

        conversation, _ = PrivateConversation.get_or_create_conversation(
            residence=self.residence,
            member_a=self.student_membership,
            member_b=self.student_two_membership,
        )
        private_serializer = PrivateConversationSerializer(context={})
        self.assertIsNone(private_serializer.get_last_message(conversation))
        self.assertEqual(private_serializer.get_unread_count(conversation), 0)

        start_serializer = StartConversationSerializer(
            context={
                "request": SimpleNamespace(residence=self.residence),
                "my_membership": self.student_membership,
            }
        )
        with self.assertRaises(Exception):
            start_serializer.validate_membership_id(self.admin_membership.id)

        send_serializer = SendMessageSerializer()
        self.assertEqual(send_serializer.validate_content("  hola  "), "hola")

    def test_realtime_local_subscriber_and_publish_helpers(self):
        q = realtime._subscribe_local(self.residence.id)
        self.assertIn(q, realtime._local_subscribers[self.residence.id])

        realtime._publish_local(self.residence.id, "payload")
        self.assertEqual(q.get(timeout=1), "payload")

        realtime._unsubscribe_local(self.residence.id, q)
        self.assertNotIn(self.residence.id, realtime._local_subscribers)

        realtime._unsubscribe_local(self.residence.id, q)

    @patch("apps.chats.realtime._get_redis_client")
    @patch("apps.chats.realtime._publish_local")
    def test_publish_chat_event_branches(self, publish_local_mock, redis_client_mock):
        realtime.publish_chat_event(0, "ignored", {})
        publish_local_mock.assert_not_called()

        redis_client_mock.return_value.publish.side_effect = realtime.redis.RedisError("down")
        realtime.publish_chat_event(self.residence.id, "ev", {"x": 1})
        publish_local_mock.assert_called_once()

    def test_realtime_publish_local_handles_queue_errors(self):
        class BrokenQueue:
            def put_nowait(self, _):
                raise RuntimeError("boom")

        realtime._local_subscribers[self.residence.id].add(BrokenQueue())
        realtime._publish_local(self.residence.id, "x")
        realtime._local_subscribers.clear()

    @patch("apps.chats.realtime._get_redis_client")
    def test_stream_chat_events_with_redis_pubsub(self, redis_client_mock):
        class PubSubStub:
            def __init__(self):
                self._calls = 0
                self.closed = False

            def subscribe(self, _channel):
                return None

            def get_message(self, timeout=0.01):
                self._calls += 1
                if self._calls == 1:
                    return {"type": "message", "data": "payload"}
                return None

            def close(self):
                self.closed = True

        pubsub = PubSubStub()
        redis_client_mock.return_value.pubsub.return_value = pubsub

        generator = realtime.stream_chat_events(self.residence.id, keepalive_seconds=9999)
        first_chunk = next(generator)
        second_chunk = next(generator)
        self.assertEqual(first_chunk, "retry: 5000\n\n")
        self.assertEqual(second_chunk, "data: payload\n\n")
        generator.close()
        self.assertTrue(pubsub.closed)

    @patch("apps.chats.realtime._subscribe_local")
    @patch("apps.chats.realtime._unsubscribe_local")
    @patch("apps.chats.realtime._get_redis_client")
    def test_stream_chat_events_fallback_local_and_ping(self, redis_client_mock, unsubscribe_mock, subscribe_mock):
        redis_client_mock.side_effect = realtime.redis.RedisError("down")
        queue_obj = realtime.Queue()
        queue_obj.put("local-payload")
        subscribe_mock.return_value = queue_obj

        with patch("apps.chats.realtime.time.monotonic", side_effect=[0, 2, 4, 6]):
            generator = realtime.stream_chat_events(self.residence.id, keepalive_seconds=1)
            first_chunk = next(generator)
            second_chunk = next(generator)
            third_chunk = next(generator)
            self.assertEqual(first_chunk, "retry: 5000\n\n")
            self.assertEqual(second_chunk, "data: local-payload\n\n")
            self.assertEqual(third_chunk, "event: ping\ndata: {}\n\n")
            generator.close()

        unsubscribe_mock.assert_called_once()

    def test_view_unit_not_found_and_validation_branches(self):
        private_view = PrivateConversationViewSet()

        request_without_residence = SimpleNamespace(user=self.student_user, residence=None)
        self.assertIsNone(private_view._get_membership(request_without_residence))

        no_membership_request = SimpleNamespace(user=self.no_membership_user, residence=self.residence)
        self.assertEqual(private_view.list(no_membership_request).data, [])

        with self.assertRaises(NotFound):
            private_view.retrieve(no_membership_request, pk=self.group.id)
        with self.assertRaises(ValidationError):
            private_view.start(no_membership_request)
        with self.assertRaises(NotFound):
            private_view.messages(no_membership_request, pk=self.group.id)

        student_request = SimpleNamespace(user=self.student_user, residence=self.residence, method="GET", data={})
        with self.assertRaises(NotFound):
            private_view.retrieve(student_request, pk=999999)
        with self.assertRaises(NotFound):
            private_view.messages(student_request, pk=999999)

        my_groups_view = MyGroupsViewSet()
        my_groups_view.request = request_without_residence
        self.assertEqual(my_groups_view.get_queryset().count(), 0)

        my_groups_view.request = no_membership_request
        self.assertEqual(my_groups_view.get_queryset().count(), 0)

        with self.assertRaises(ValidationError):
            my_groups_view.leave(no_membership_request, pk=self.group.id)

        student_simple_request = SimpleNamespace(user=self.student_user, residence=self.residence, method="GET", data={})
        with self.assertRaises(NotFound):
            my_groups_view.leave(student_simple_request, pk=999999)
        with self.assertRaises(NotFound):
            my_groups_view.messages(student_simple_request, pk=999999)

        chat_member = self._add_student_to_group()
        chat_member.can_interact = False
        chat_member.interaction_disabled_at = None
        chat_member.save(update_fields=["can_interact", "interaction_disabled_at"])
        GroupMessage.objects.create(group=self.group, sender=self.admin_membership, content="old")
        self.assertEqual(
            self.student_client.get(self._url(f"/my-groups/{self.group.id}/messages/")).status_code,
            200,
        )
        chat_member.refresh_from_db()
        self.assertIsNotNone(chat_member.interaction_disabled_at)

    # Permissions

    def test_chat_group_create_non_admin_forbidden(self):
        payload = {
            "name": "Forbidden Group",
            "description": "Should fail",
            "label": "general",
            "can_members_leave": True,
        }

        response = self.student_client.post(self._url("/groups/"), payload, content_type="application/json")
        self.assertEqual(response.status_code, 403)

    def test_chat_group_delete_non_admin_forbidden(self):
        response = self.student_client.delete(self._url(f"/groups/{self.group.id}/"))
        self.assertEqual(response.status_code, 403)

    def test_chat_labels_non_admin_forbidden(self):
        response = self.student_client.get(self._url("/labels/"))
        self.assertEqual(response.status_code, 403)

    def test_user_without_membership_forbidden_in_my_groups(self):
        response = self.outsider_client.get(self._url("/my-groups/"))
        self.assertEqual(response.status_code, 403)

    def test_unauthenticated_groups(self):
        response = self.anon_client.get(self._url("/groups/"))
        self.assertEqual(response.status_code, 403)
