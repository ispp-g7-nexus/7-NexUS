import os
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django_tenants.utils import schema_context
from apps.tenants.models import Client
from datetime import timedelta
import random

User = get_user_model()

class Command(BaseCommand):
    help = "Crea eventos de prueba para testing de funcionalidades en residencia"

    def add_arguments(self, parser):
        parser.add_argument("--tenant-domain", default=None, help="Dominio del tenant (ej: demo.nexus.local)")
        parser.add_argument("--schema", default=None, help="Schema del tenant")
        parser.add_argument("--residence-code", default="DEMO-01", help="Código de la residencia")

    def _env_or_option(self, options, option_key, env_key, default):
        option_value = options.get(option_key)
        if isinstance(option_value, str) and option_value.strip():
            return option_value.strip()
        env_value = os.getenv(env_key, "").strip()
        if env_value:
            return env_value
        return default

    def _safe_schema_name(self, value: str) -> str:
        normalized = value.strip().lower().replace("-", "_").replace(".", "_")
        return normalized or "demo"

    def handle(self, *args, **options):
        tenant_domain = self._env_or_option(options, "tenant_domain", "DEMO_TENANT_DOMAIN", "demo.nexus.local")
        schema_name = self._env_or_option(options, "schema", "DEMO_TENANT_SCHEMA", 
                                        self._safe_schema_name(tenant_domain.split(".", 1)[0]))
        residence_code = options.get("residence_code", "DEMO-01")

        try:
            # Find the tenant by schema name or domain
            tenant = None
            if schema_name:
                tenant = Client.objects.filter(schema_name=schema_name).first()
            if not tenant and tenant_domain:
                domain_obj = tenant.domains.filter(domain=tenant_domain).first()
                if domain_obj:
                    tenant = domain_obj.tenant

            if not tenant:
                self.stdout.write(
                    self.style.ERROR(
                        f"No se encontró tenant con schema '{schema_name}' o dominio '{tenant_domain}'. "
                        "Ejecuta primero: python manage.py seed_demo"
                    )
                )
                return

            # Work within the tenant schema
            with schema_context(tenant.schema_name):
                from apps.residences.models import Residence
                from apps.events.models import Event

                # Find the residence
                residence = Residence.objects.filter(code=residence_code).first()
                if not residence:
                    self.stdout.write(
                        self.style.ERROR(
                            f"No se encontró residencia con código '{residence_code}'. "
                            "Verifica que existe o ejecuta: python manage.py seed_demo"
                        )
                    )
                    return

                # Find available users to be event hosts
                users = User.objects.all()
                if not users.exists():
                    self.stdout.write(
                        self.style.WARNING('No hay usuarios en la base de datos. Crea usuarios primero.')
                    )
                    return

                # Event seed data - EVENTOS FUTUROS
                events_data = [
                    {
                        'title': 'Noche de Juegos de Mesa',
                        'description': 'Únete a nosotros para una noche divertida con juegos de mesa clásicos y modernos. Perfecto para conocer a otros residentes y pasar un buen rato.',
                        'start_time': timezone.now() + timedelta(days=2, hours=20),
                        'end_time': timezone.now() + timedelta(days=2, hours=23),
                        'location': 'Sala Común Principal',
                        'max_participants': 25,
                        'tags': 'social,entretenimiento,juegos',
                        'image_url': 'https://plus.unsplash.com/premium_photo-1718879381673-32a65784d27c?fm=jpg&q=60&w=3000&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8anVlZ29zJTIwZGUlMjBtZXNhfGVufDB8fDB8fHww'
                    },
                    {
                        'title': 'Taller de Cocina Internacional',
                        'description': 'Aprende a cocinar platos típicos de diferentes países. Cada participante preparará una receta tradicional de su país de origen.',
                        'start_time': timezone.now() + timedelta(days=5, hours=18),
                        'end_time': timezone.now() + timedelta(days=5, hours=21),
                        'location': 'Cocina Comunitaria',
                        'max_participants': 12,
                        'tags': 'cocina,cultural,internacional',
                        'image_url': 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400'
                    },
                    {
                        'title': 'Sesión de Estudio Grupal - Exámenes',
                        'description': 'Sesión colaborativa de estudio para los exámenes finales. Intercambio de apuntes, resolución de dudas y técnicas de estudio.',
                        'start_time': timezone.now() + timedelta(days=7, hours=16),
                        'end_time': timezone.now() + timedelta(days=7, hours=19),
                        'location': 'Biblioteca',
                        'max_participants': 20,
                        'tags': 'académico,estudio,colaborativo',
                        'image_url': 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'
                    },
                    {
                        'title': 'Torneo de Ping Pong',
                        'description': 'Competencia amistosa de ping pong entre residentes. Habrá premios para los tres primeros lugares y refrescos para todos.',
                        'start_time': timezone.now() + timedelta(days=3, hours=17),
                        'end_time': timezone.now() + timedelta(days=3, hours=20),
                        'location': 'Sala de Juegos',
                        'max_participants': 16,
                        'tags': 'deportivo,competencia,torneo',
                        'image_url': 'https://weezevent.com/wp-content/uploads/2023/04/03144053/organizar-torneo-ping-pong.jpg'
                    },
                    {
                        'title': 'Clase de Yoga Matutina',
                        'description': 'Comienza el día con energía positiva. Clase de yoga para todos los niveles, incluye técnicas de respiración y relajación.',
                        'start_time': timezone.now() + timedelta(days=1, hours=7),
                        'end_time': timezone.now() + timedelta(days=1, hours=8),
                        'location': 'Terraza',
                        'max_participants': 15,
                        'tags': 'bienestar,yoga,morning',
                        'image_url': 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400'
                    },
                    {
                        'title': 'Noche de Karaoke',
                        'description': 'Demuestra tu talento vocal en nuestra noche de karaoke. Canciones en español, inglés y otros idiomas disponibles.',
                        'start_time': timezone.now() + timedelta(days=10, hours=21),
                        'end_time': timezone.now() + timedelta(days=10, hours=23),
                        'location': 'Sala Común Principal',
                        'max_participants': 30,
                        'tags': 'música,entretenimiento,karaoke',
                        'image_url': 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400'
                    },
                    {
                        'title': 'Intercambio de Idiomas',
                        'description': 'Practica idiomas con estudiantes internacionales. Español, inglés, francés, alemán y más. Ambiente relajado con café y snacks.',
                        'start_time': timezone.now() + timedelta(days=4, hours=19),
                        'end_time': timezone.now() + timedelta(days=4, hours=21),
                        'location': 'Cafetería',
                        'max_participants': 25,
                        'tags': 'idiomas,internacional,intercambio',
                        'image_url': 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=400'
                    },
                    {
                        'title': 'Taller de CV y Entrevistas',
                        'description': 'Mejora tu CV y practica entrevistas de trabajo con profesionales de RRHH. Incluye feedback personalizado y consejos prácticos.',
                        'start_time': timezone.now() + timedelta(days=12, hours=17),
                        'end_time': timezone.now() + timedelta(days=12, hours=19),
                        'location': 'Aula Multiusos',
                        'max_participants': 18,
                        'tags': 'profesional,cv,entrevistas',
                        'image_url': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400'
                    },
                    {
                        'title': 'Gaming Night: FIFA Tournament',
                        'description': 'Torneo de FIFA entre residentes. Consolas PlayStation disponibles. Premios para los ganadores y diversión garantizada.',
                        'start_time': timezone.now() + timedelta(days=11, hours=20),
                        'end_time': timezone.now() + timedelta(days=11, hours=23),
                        'location': 'Sala de Juegos',
                        'max_participants': 20,
                        'tags': 'gaming,fifa,torneo',
                        'image_url': 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=400'
                    },
                    {
                        'title': 'Sesión de Mindfulness',
                        'description': 'Técnicas de meditación y mindfulness para manejar el estrés académico. Perfecto para época de exámenes y relajación.',
                        'start_time': timezone.now() + timedelta(days=13, hours=19),
                        'end_time': timezone.now() + timedelta(days=13, hours=20),
                        'location': 'Sala de Yoga',
                        'max_participants': 12,
                        'tags': 'bienestar,mindfulness,relajación',
                        'image_url': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400'
                    },
                    # EVENTOS PASADOS
                    {
                        'title': 'Noche de Películas de Terror',
                        'description': 'Maratón de películas clásicas de terror: El Resplandor, Psicosis y El Exorcista. Con palomitas y mantas para los valientes.',
                        'start_time': timezone.now() - timedelta(days=8, hours=20),
                        'end_time': timezone.now() - timedelta(days=8, hours=2),
                        'location': 'Sala de TV',
                        'max_participants': 18,
                        'tags': 'películas,terror,entretenimiento',
                        'image_url': 'https://media.istockphoto.com/id/651970708/es/foto/dos-mujeres-viendo-la-televisi%C3%B3n-juntos-pel%C3%ADcula-de-terror.jpg?s=612x612&w=0&k=20&c=sRd2C9JnYgFw5lLV1KExh-oWpmhMryKRXjbhyYSXBl8='
                    },
                    {
                        'title': 'Torneo de Ajedrez',
                        'description': 'Competencia de ajedrez por eliminación directa. Participaron 16 residentes y hubo grandes partidas estratégicas.',
                        'start_time': timezone.now() - timedelta(days=12, hours=15),
                        'end_time': timezone.now() - timedelta(days=12, hours=20),
                        'location': 'Biblioteca',
                        'max_participants': 16,
                        'tags': 'ajedrez,estrategia,torneo',
                        'image_url': 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=400'
                    },
                    {
                        'title': 'Clase de Baile Latino',
                        'description': 'Aprendimos pasos básicos de salsa, bachata y merengue. Una tarde llena de ritmo y diversión para todos los niveles.',
                        'start_time': timezone.now() - timedelta(days=15, hours=18),
                        'end_time': timezone.now() - timedelta(days=15, hours=20),
                        'location': 'Sala Común Principal',
                        'max_participants': 22,
                        'tags': 'baile,latino,música',
                        'image_url': 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400'
                    },
                    {
                        'title': 'Sesión de Debate: Inteligencia Artificial',
                        'description': 'Debate sobre el impacto de la IA en el futuro laboral. Intercambio de ideas y perspectivas entre estudiantes de diferentes carreras.',
                        'start_time': timezone.now() - timedelta(days=18, hours=19),
                        'end_time': timezone.now() - timedelta(days=18, hours=21),
                        'location': 'Aula Multiusos',
                        'max_participants': 15,
                        'tags': 'debate,tecnología,académico',
                        'image_url': 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400'
                    },
                    {
                        'title': 'Noche de Trivial',
                        'description': 'Competencia de conocimientos generales por equipos. Preguntas de cultura general, ciencia, deportes y entretenimiento.',
                        'start_time': timezone.now() - timedelta(days=22, hours=20),
                        'end_time': timezone.now() - timedelta(days=22, hours=22),
                        'location': 'Cafetería',
                        'max_participants': 24,
                        'tags': 'trivial,conocimiento,equipos',
                        'image_url': 'https://images.ecestaticos.com/nkhQVeRJEzCF3XJBA_CNBDeYKrM=/0x0:2048x1365/1200x900/filters:fill(white):format(jpg)/f.elconfidencial.com%2Foriginal%2F2b8%2F02b%2Fcab%2F2b802bcabd2fdaa60d5ea573b2a0b334.jpg'
                    },
                    {
                        'title': 'Taller de Primeros Auxilios',
                        'description': 'Curso básico de primeros auxilios con profesionales sanitarios. Aprendimos RCP, vendajes y actuación ante emergencias.',
                        'start_time': timezone.now() - timedelta(days=25, hours=16),
                        'end_time': timezone.now() - timedelta(days=25, hours=18),
                        'location': 'Aula Multiusos',
                        'max_participants': 20,
                        'tags': 'salud,primeros auxilios,formación',
                        'image_url': 'https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=400'
                    },
                    {
                        'title': 'Fiesta de Fin de Exámenes',
                        'description': 'Celebramos el final del período de exámenes con música, karaoke y cena especial. ¡Todos merecían descansar!',
                        'start_time': timezone.now() - timedelta(days=30, hours=20),
                        'end_time': timezone.now() - timedelta(days=30, hours=2),
                        'location': 'Patio Central',
                        'max_participants': 80,
                        'tags': 'fiesta,celebración,exámenes',
                        'image_url': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400'
                    },
                    {
                        'title': 'Mercadillo de Segunda Mano',
                        'description': 'Intercambio y venta de objetos de segunda mano entre residentes: libros, ropa, decoración y electrónicos.',
                        'start_time': timezone.now() - timedelta(days=35, hours=10),
                        'end_time': timezone.now() - timedelta(days=35, hours=14),
                        'location': 'Patio Central',
                        'max_participants': 40,
                        'tags': 'intercambio,segunda mano,sostenible',
                        'image_url': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'
                    }
                ]

                created_count = 0
                updated_count = 0

                for event_data in events_data:
                    # Assign residence and random host
                    event_data['residence'] = residence
                    event_data['host'] = random.choice(users)
                    
                    event, created = Event.objects.update_or_create(
                        title=event_data['title'],
                        residence=residence,
                        defaults={
                            'description': event_data['description'],
                            'start_time': event_data['start_time'],
                            'end_time': event_data['end_time'],
                            'location': event_data['location'],
                            'max_participants': event_data['max_participants'],
                            'tags': event_data['tags'],
                            'image_url': event_data.get('image_url'),
                            'host': event_data['host'],
                        }
                    )
                    
                    if created:
                        created_count += 1
                    else:
                        updated_count += 1

                self.stdout.write(self.style.SUCCESS(f"Seeder de eventos completado:"))
                self.stdout.write(f"   - {created_count} eventos creados")
                self.stdout.write(f"   - {updated_count} eventos actualizados")
                self.stdout.write(f"   - Residencia: {residence.name} ({residence_code})")
                self.stdout.write(f"   - Tenant: {tenant.name} ({tenant.schema_name})")

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error ejecutando seeder: {str(e)}"))
            raise