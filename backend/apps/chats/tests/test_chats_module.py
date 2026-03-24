import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.chats.models import ChatGroup, ChatGroupLabel, ChatGroupMember, GroupMessage, PrivateConversation, PrivateMessage
from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceDomain


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
            password="demo1234",
            is_staff=True,
        )
        self.student_user = user_model.objects.create_user(
            username="student-chat",
            email="student@chats.test",
            password="demo1234",
        )
        self.student_two_user = user_model.objects.create_user(
            username="student-two-chat",
            email="student2@chats.test",
            password="demo1234",
        )
        self.no_membership_user = user_model.objects.create_user(
            username="outsider-chat",
            email="outsider@chats.test",
            password="demo1234",
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

    def test_chat_events_stream_requires_active_membership(self):
        response = self.outsider_client.get(self._url("/events/"))
        self.assertEqual(response.status_code, 400)

    @patch("apps.chats.views.stream_chat_events")
    def test_chat_events_stream_success(self, stream_mock):
        stream_mock.return_value = iter(["retry: 5000\n\n"])

        response = self.student_client.get(self._url("/events/"))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response["Content-Type"], "text/event-stream")

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
