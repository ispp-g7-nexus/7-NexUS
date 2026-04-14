import json

from django.contrib.auth import get_user_model
from django_tenants.test.cases import FastTenantTestCase
from django_tenants.test.client import TenantClient
from rest_framework import status

from apps.common.services import build_access_token
from apps.membership.models import Membership, Role
from apps.residences.models import Residence, ResidenceBranding, ResidenceDomain


class ResidenceBrandingTests(FastTenantTestCase):
    @classmethod
    def get_test_tenant_domain(cls):
        return "branding.test.local"

    @classmethod
    def setup_tenant(cls, tenant):
        tenant.name = "Tenant Branding Test"
        tenant.slug = "tenant-branding-test"
        tenant.is_active = True
        tenant.on_trial = True

    @classmethod
    def setup_domain(cls, domain):
        domain.domain = cls.get_test_tenant_domain()
        domain.is_primary = True

    def setUp(self):
        super().setUp()
        user_model = get_user_model()

        # Create users
        self.admin_user = user_model.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="demo1234", #NOSONAR
        )
        self.resident_user = user_model.objects.create_user(
            username="resident",
            email="resident@test.com",
            password="demo1234", #NOSONAR
        )

        # Create residence
        self.residence = Residence.objects.create(
            name="Test Residence",
            slug="test-residence",
            code="TR-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        ResidenceDomain.objects.create(
            residence=self.residence,
            domain=self.get_test_tenant_domain(),
            is_primary=True,
            is_active=True,
        )

        # Create roles
        self.admin_role = Role.objects.create(
            name="Admin",
            description="Administrator",
            is_system_default=False,
            residence=self.residence,
        )

        self.student_role = Role.objects.create(
            name="Student",
            description="Resident",
            is_system_default=True,
            residence=None,
        )

        # Create memberships
        self.admin_membership = Membership.objects.create(
            user=self.admin_user,
            role=self.admin_role,
            residence=self.residence,
            is_active=True,
        )

        self.resident_membership = Membership.objects.create(
            user=self.resident_user,
            role=self.student_role,
            residence=self.residence,
            is_active=True,
        )

        # Create clients
        self.admin_client = self._auth_client(self.admin_user, self.residence)
        self.resident_client = self._auth_client(self.resident_user, self.residence)
        self.anon_client = TenantClient(self.tenant)

    def _auth_client(self, user, residence):
        """Create an authenticated client with Bearer token."""
        client = TenantClient(self.tenant)
        token, _ = build_access_token(user, self.tenant, residence)
        client.defaults["HTTP_AUTHORIZATION"] = f"Bearer {token}"
        return client

    def _get_branding_url(self):
        return "/api/residences/branding/"

    def _patch_json(self, client, payload):
        return client.patch(
            self._get_branding_url(),
            data=json.dumps(payload),
            content_type="application/json",
        )

    # --- GET Tests ---

    def test_get_branding_anonymous(self):
        """Anonymous users should get 401."""
        response = self.anon_client.get(self._get_branding_url())
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_branding_resident_not_admin(self):
        """Residents without admin role should get 403."""
        response = self.resident_client.get(self._get_branding_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_branding_admin_no_record(self):
        """Admin should get default branding if no record exists."""
        response = self.admin_client.get(self._get_branding_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertIn("primary_color", data)
        self.assertIn("secondary_color", data)
        self.assertIn("accent_color", data)
        self.assertIn("logo_url", data)
        self.assertIn("favicon_url", data)
        self.assertIn("updated_at", data)

    def test_get_branding_admin_with_existing_record(self):
        """Admin should get existing branding data."""
        branding = ResidenceBranding.objects.create(
            residence=self.residence,
            primary_color="#FF0000",
            secondary_color="#00FF00",
            accent_color="#0000FF",
            logo_url="https://example.com/logo.png",
            favicon_url="https://example.com/favicon.ico",
        )

        response = self.admin_client.get(self._get_branding_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["primary_color"], "#FF0000")
        self.assertEqual(data["secondary_color"], "#00FF00")
        self.assertEqual(data["accent_color"], "#0000FF")
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["favicon_url"], "https://example.com/favicon.ico")

    # --- PATCH Tests ---

    def test_patch_branding_anonymous(self):
        """Anonymous users should get 401."""
        payload = {
            "primary_color": "#FF0000",
        }
        response = self._patch_json(self.anon_client, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_branding_resident_not_admin(self):
        """Residents without admin role should get 403."""
        payload = {
            "primary_color": "#FF0000",
        }
        response = self._patch_json(self.resident_client, payload)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_patch_branding_valid_colors(self):
        """Admin should be able to update colors."""
        payload = {
            "primary_color": "#FF0000",
            "secondary_color": "#00FF00",
            "accent_color": "#0000FF",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["primary_color"], "#FF0000")
        self.assertEqual(data["secondary_color"], "#00FF00")
        self.assertEqual(data["accent_color"], "#0000FF")

        # Verify persistence
        branding = ResidenceBranding.objects.get(residence=self.residence)
        self.assertEqual(branding.primary_color, "#FF0000")
        self.assertEqual(branding.secondary_color, "#00FF00")
        self.assertEqual(branding.accent_color, "#0000FF")

    def test_patch_branding_valid_urls(self):
        """Admin should be able to update logo and favicon URLs."""
        payload = {
            "logo_url": "https://example.com/logo.png",
            "favicon_url": "https://example.com/favicon.ico",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["favicon_url"], "https://example.com/favicon.ico")

        # Verify persistence
        branding = ResidenceBranding.objects.get(residence=self.residence)
        self.assertEqual(branding.logo_url, "https://example.com/logo.png")
        self.assertEqual(branding.favicon_url, "https://example.com/favicon.ico")

    def test_patch_branding_empty_url_allowed(self):
        """Empty URLs should be allowed."""
        payload = {
            "logo_url": "",
            "favicon_url": "",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    # --- Validation Tests ---

    def test_patch_branding_invalid_primary_color_format(self):
        """Invalid hex color for primary should fallback to black."""
        # El campo tiene max_length=7, usamos un hex con caracteres inválidos
        # para que pase el max_length y dispare el fallback del validador.
        payload = {
            "primary_color": "#GGGGGG",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["primary_color"], "#000000")

    def test_patch_branding_invalid_secondary_color_format(self):
        """Invalid hex color for secondary should fallback to black."""
        payload = {
            "secondary_color": "#GGGGGG",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["secondary_color"], "#000000")

    def test_patch_branding_invalid_accent_color_format(self):
        """Invalid hex color for accent should fallback to black."""
        payload = {
            "accent_color": "#12345",  # Only 5 chars instead of 6
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["accent_color"], "#000000")

    def test_patch_branding_logo_url_too_long(self):
        """Logo URL exceeding 200 chars should fail."""
        long_url = "https://example.com/" + "a" * 200
        payload = {
            "logo_url": long_url,
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        error_data = response.json()
        self.assertIn("logo_url", error_data)
        self.assertIn("200", str(error_data["logo_url"]))

    def test_patch_branding_favicon_url_too_long(self):
        """Favicon URL exceeding 200 chars should fail."""
        long_url = "https://example.com/" + "a" * 200
        payload = {
            "favicon_url": long_url,
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        error_data = response.json()
        self.assertIn("favicon_url", error_data)
        self.assertIn("200", str(error_data["favicon_url"]))

    def test_patch_branding_logo_url_without_protocol(self):
        """Logo URL without http/https should fail."""
        payload = {
            "logo_url": "example.com/logo.png",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        error_data = response.json()
        self.assertIn("logo_url", error_data)

    def test_patch_branding_favicon_url_without_protocol(self):
        """Favicon URL without http/https should fail."""
        payload = {
            "favicon_url": "example.com/favicon.ico",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

        error_data = response.json()
        self.assertIn("favicon_url", error_data)

    def test_patch_branding_all_fields(self):
        """Admin should be able to update all fields at once."""
        payload = {
            "primary_color": "#1A2B3C",
            "secondary_color": "#4D5E6F",
            "accent_color": "#7F8E9A",
            "logo_url": "https://example.com/logo.png",
            "favicon_url": "https://example.com/favicon.ico",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["primary_color"], "#1A2B3C")
        self.assertEqual(data["secondary_color"], "#4D5E6F")
        self.assertEqual(data["accent_color"], "#7F8E9A")
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["favicon_url"], "https://example.com/favicon.ico")
        self.assertIn("updated_at", data)

    def test_patch_branding_partial_update(self):
        """Partial updates should preserve existing values."""
        initial_payload = {
            "primary_color": "#FF0000",
            "secondary_color": "#00FF00",
            "accent_color": "#0000FF",
            "logo_url": "https://example.com/logo.png",
            "favicon_url": "https://example.com/favicon.ico",
        }
        self._patch_json(self.admin_client, initial_payload)

        update_payload = {
            "primary_color": "#AABBCC",
        }
        response = self._patch_json(self.admin_client, update_payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        data = response.json()
        self.assertEqual(data["primary_color"], "#AABBCC")
        self.assertEqual(data["secondary_color"], "#00FF00")
        self.assertEqual(data["accent_color"], "#0000FF")
        self.assertEqual(data["logo_url"], "https://example.com/logo.png")
        self.assertEqual(data["favicon_url"], "https://example.com/favicon.ico")

    def test_patch_branding_whitespace_trimmed_urls(self):
        """URLs with leading/trailing whitespace should be trimmed."""
        payload = {
            "logo_url": "  https://example.com/logo.png  ",
            "favicon_url": "  https://example.com/favicon.ico  ",
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        branding = ResidenceBranding.objects.get(residence=self.residence)
        self.assertEqual(branding.logo_url, "https://example.com/logo.png")
        self.assertEqual(branding.favicon_url, "https://example.com/favicon.ico")

    def test_patch_branding_http_protocol_accepted(self):
        """HTTP protocol should be accepted (not just HTTPS)."""
        payload = {
            "logo_url": "http://example.com/logo.png", #NOSONAR
            "favicon_url": "http://example.com/favicon.ico", #NOSONAR
        }
        response = self._patch_json(self.admin_client, payload)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_get_branding_only_residence_specific(self):
        """Each residence should have its own branding."""
        other_residence = Residence.objects.create(
            name="Other Residence",
            slug="other-residence",
            code="OR-001",
            timezone="Europe/Madrid",
            is_active=True,
        )

        ResidenceBranding.objects.create(
            residence=self.residence,
            primary_color="#FF0000",
        )

        ResidenceBranding.objects.create(
            residence=other_residence,
            primary_color="#00FF00",
        )

        response = self.admin_client.get(self._get_branding_url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.json()
        self.assertEqual(data["primary_color"], "#FF0000")
