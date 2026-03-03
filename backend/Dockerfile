FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

ARG INSTALL_MATCHING=0

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential libpq-dev netcat-openbsd \
    && rm -rf /var/lib/apt/lists/*

COPY requirements /tmp/requirements
RUN pip install --upgrade pip \
    && pip install -r /tmp/requirements/local.txt \
    && if [ "$INSTALL_MATCHING" = "1" ]; then pip install -r /tmp/requirements/matching.txt; fi

COPY . /app
