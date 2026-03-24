FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG INSTALL_MATCHING=0
ARG APP_UID=1000
ARG APP_GID=1000

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements /tmp/requirements
RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements/local.txt \
    && if [ "$INSTALL_MATCHING" = "1" ]; then pip install -r /tmp/requirements/matching.txt; fi

RUN groupadd --gid "${APP_GID}" appgroup || true \
    && useradd --uid "${APP_UID}" --gid "${APP_GID}" --create-home --shell /bin/bash appuser || true \
    && mkdir -p /app \
    && chown -R "${APP_UID}:${APP_GID}" /app

COPY --chown=${APP_UID}:${APP_GID} manage.py /app/manage.py
COPY --chown=${APP_UID}:${APP_GID} apps /app/apps
COPY --chown=${APP_UID}:${APP_GID} config /app/config

USER ${APP_UID}:${APP_GID}
