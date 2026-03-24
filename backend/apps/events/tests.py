from django.test import SimpleTestCase

from apps.events.views import _validate_required_text_fields


class EventRequiredFieldsValidationTests(SimpleTestCase):
    def test_rejects_missing_title(self):
        title, description, error = _validate_required_text_fields(
            {"description": "Descripcion valida"}
        )

        self.assertIsNone(title)
        self.assertIsNone(description)
        self.assertEqual(error.status_code, 400)
        self.assertJSONEqual(
            error.content.decode("utf-8"),
            {"detail": "El campo 'title' es obligatorio."},
        )

    def test_rejects_blank_description(self):
        title, description, error = _validate_required_text_fields(
            {"title": "Evento", "description": "   "}
        )

        self.assertIsNone(title)
        self.assertIsNone(description)
        self.assertEqual(error.status_code, 400)
        self.assertJSONEqual(
            error.content.decode("utf-8"),
            {"detail": "El campo 'description' es obligatorio."},
        )

    def test_accepts_valid_required_fields(self):
        title, description, error = _validate_required_text_fields(
            {"title": "  Evento Demo ", "description": "  Texto de prueba "}
        )

        self.assertEqual(title, "Evento Demo")
        self.assertEqual(description, "Texto de prueba")
        self.assertIsNone(error)
