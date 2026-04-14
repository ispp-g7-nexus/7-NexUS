import json

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient

from apps.chats.models import PrivateConversation
from apps.common.services import build_access_token
from apps.matching.models import MatchLike, ResidenceCompatibility
from apps.membership.models import Membership, Role
from apps.onboarding.models import ResidentPreference
from apps.residences.models import Residence, ResidenceDomain

TEST_PASSWORD = "demo1234"  # NOSONAR


class MatchLikeTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "matching.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Matching Test"
        tenant.slug = "tenant-matching-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        self.user_a = user_model.objects.create_user(
            username="student-a", email="a@matching.test", password=TEST_PASSWORD,
            first_name="Ana", last_name="Alfa",
        )
        self.user_b = user_model.objects.create_user(
            username="student-b", email="b@matching.test", password=TEST_PASSWORD,
            first_name="Beto", last_name="Bravo",
        )

        self.residence = Residence.objects.create(
            name="Residence Matching",
            slug="res-matching",
            code="RMA-1",
            timezone="Europe/Madrid",
            is_active=True,
        )
        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        self.student_role, _ = Role.objects.get_or_create(
            name="Student",
            residence=None,
            defaults={"description": "Student", "is_system_default": True},
        )

        self.membership_a = Membership.objects.create(
            user=self.user_a, role=self.student_role, residence=self.residence,
            is_active=True,
        )
        self.membership_b = Membership.objects.create(
            user=self.user_b, role=self.student_role, residence=self.residence,
            is_active=True,
        )

        # Onboarding completo para ambos (MyMatchesView lo requiere)
        ResidentPreference.objects.create(membership=self.membership_a, is_completed=True)
        ResidentPreference.objects.create(membership=self.membership_b, is_completed=True)

        self.client_a = self._auth_client(self.user_a)
        self.client_b = self._auth_client(self.user_b)

    def _auth_client(self, user):
        client = TenantClient(self.tenant)
        client.defaults["HTTP_HOST"] = self.get_test_tenant_domain()
        token, _ = build_access_token(user, self.tenant, self.residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    # ---------- Modelo ----------

    def test_match_like_unique_per_source_target(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        with self.assertRaises(IntegrityError):
            MatchLike.objects.create(
                residence=self.residence,
                source=self.membership_a,
                target=self.membership_b,
            )

    def test_match_like_allows_reverse(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_b, target=self.membership_a
        )
        self.assertEqual(MatchLike.objects.count(), 2)

    def test_match_like_str(self):
        like = MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        self.assertIn("->", str(like))

    # ---------- Endpoints like / unlike ----------

    def test_post_like_creates_row(self):
        resp = self.client_a.post(
            "/api/matching/likes/",
            data=json.dumps({"membership_id": self.membership_b.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertFalse(resp.json()["is_mutual"])
        self.assertTrue(
            MatchLike.objects.filter(
                source=self.membership_a, target=self.membership_b
            ).exists()
        )

    def test_post_like_reports_mutual(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_b, target=self.membership_a
        )
        resp = self.client_a.post(
            "/api/matching/likes/",
            data=json.dumps({"membership_id": self.membership_b.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 201)
        self.assertTrue(resp.json()["is_mutual"])

    def test_post_like_self_rejected(self):
        resp = self.client_a.post(
            "/api/matching/likes/",
            data=json.dumps({"membership_id": self.membership_a.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)

    def test_post_like_missing_id(self):
        resp = self.client_a.post(
            "/api/matching/likes/", data=json.dumps({}), content_type="application/json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_delete_like_removes_row(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        resp = self.client_a.delete(f"/api/matching/likes/{self.membership_b.id}/")
        self.assertEqual(resp.status_code, 204)
        self.assertFalse(
            MatchLike.objects.filter(
                source=self.membership_a, target=self.membership_b
            ).exists()
        )

    # ---------- MyMatchesView enriquecido ----------

    def test_my_matches_includes_like_flags(self):
        ResidenceCompatibility.objects.create(
            residence=self.residence,
            source_membership=self.membership_a,
            target_membership=self.membership_b,
            score=0.9,
        )
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_b, target=self.membership_a
        )

        resp = self.client_a.get("/api/matching/me/?limit=10")
        self.assertEqual(resp.status_code, 200)
        body = resp.json()
        self.assertEqual(body["status"], "ready")
        self.assertEqual(len(body["matches"]), 1)
        self.assertTrue(body["matches"][0]["liked_by_me"])
        self.assertTrue(body["matches"][0]["is_mutual"])

    def test_my_matches_without_likes(self):
        ResidenceCompatibility.objects.create(
            residence=self.residence,
            source_membership=self.membership_a,
            target_membership=self.membership_b,
            score=0.5,
        )
        resp = self.client_a.get("/api/matching/me/?limit=10")
        self.assertEqual(resp.status_code, 200)
        match = resp.json()["matches"][0]
        self.assertFalse(match["liked_by_me"])
        self.assertFalse(match["is_mutual"])

    # ---------- Start chat (gate) ----------

    def test_start_match_chat_requires_mutual(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        resp = self.client_a.post(
            "/api/matching/chats/start/",
            data=json.dumps({"membership_id": self.membership_b.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 403)

    def test_start_match_chat_mutual_ok(self):
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_a, target=self.membership_b
        )
        MatchLike.objects.create(
            residence=self.residence, source=self.membership_b, target=self.membership_a
        )
        resp = self.client_a.post(
            "/api/matching/chats/start/",
            data=json.dumps({"membership_id": self.membership_b.id}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 200)
        self.assertIn("conversation_id", resp.json())
        self.assertTrue(
            PrivateConversation.objects.filter(id=resp.json()["conversation_id"]).exists()
        )

    def test_start_match_chat_missing_id(self):
        resp = self.client_a.post(
            "/api/matching/chats/start/",
            data=json.dumps({}),
            content_type="application/json",
        )
        self.assertEqual(resp.status_code, 400)
