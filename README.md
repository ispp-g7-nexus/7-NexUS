# NexUS - Entorno de Desarrollo y Produccion

## Desarrollo rapido

Arranque base para desarrollo:

```bash
docker compose up -d
```

### Prerequisitos minimos

1. Tener `.env` (copiado desde `.env.local.example`).
2. Anadir en `hosts`: `127.0.0.1 demo.nexus.local`.
3. Primera vez recomendable: `docker compose up -d --build`.

Comandos recomendados:

```bash
cp .env.local.example .env
```


## Seed demo automatico al arrancar backend

Queda habilitado en desarrollo (`SEED_DEMO_ON_STARTUP=1`) y crea:

- Tenant: `demo.nexus.local`
- Admin: `admin@demo.nexus.local / demo1234`
- Estudiante: `estudiante@demo.nexus.local / demo1234`

## Nota sobre autoreload del backend

- En desarrollo, el backend usa `runserver` con volumen `./backend:/app`.
- Cuando cambias codigo Python, Django recarga el proceso automaticamente.
- No se recrea el contenedor por cada cambio.
- Migraciones y seed se ejecutan al arrancar el contenedor backend, no en cada guardado.

## Produccion

Se incluye `docker-compose.prod.yml`.

Arranque:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

Variables recomendadas para prod:

```bash
cp .env.prod.example .env
```

Detalles clave en produccion:

- Backend con `gunicorn` y `config.settings.production`.
- Seed demo desactivado (`SEED_DEMO_ON_STARTUP=0`).
- Frontend SSR en modo `production` (`npm run build` + `npm run preview:ssr`).
- Nginx expuesto en `:80`.
