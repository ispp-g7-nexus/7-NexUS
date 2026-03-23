import json
import time
from collections import defaultdict
from collections.abc import Generator
from queue import Empty, Queue
from threading import Lock

import redis
from django.conf import settings


CHANNEL_PREFIX = "chats:events:residence:"
_local_subscribers: dict[int, set[Queue[str]]] = defaultdict(set)
_local_lock = Lock()


def _get_redis_client() -> redis.Redis:
	return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _channel_name(residence_id: int) -> str:
	return f"{CHANNEL_PREFIX}{residence_id}"


def _subscribe_local(residence_id: int) -> Queue[str]:
	q: Queue[str] = Queue()
	with _local_lock:
		_local_subscribers[residence_id].add(q)
	return q


def _unsubscribe_local(residence_id: int, queue_obj: Queue[str]) -> None:
	with _local_lock:
		subscribers = _local_subscribers.get(residence_id)
		if not subscribers:
			return
		subscribers.discard(queue_obj)
		if not subscribers:
			_local_subscribers.pop(residence_id, None)


def _publish_local(residence_id: int, message: str) -> None:
	with _local_lock:
		subscribers = list(_local_subscribers.get(residence_id, set()))

	for q in subscribers:
		try:
			q.put_nowait(message)
		except Exception:
			continue


def publish_chat_event(residence_id: int, event: str, payload: dict | None = None) -> None:
	if not residence_id:
		return

	message = {
		"event": event,
		"payload": payload or {},
		"ts": int(time.time()),
	}
	serialized = json.dumps(message)

	_publish_local(residence_id, serialized)

	try:
		_get_redis_client().publish(_channel_name(residence_id), serialized)
	except redis.RedisError:
		# No levantamos error: la operacion principal (crear/editar chat) debe continuar.
		return


def stream_chat_events(residence_id: int, keepalive_seconds: int = 20) -> Generator[str, None, None]:
	local_queue: Queue[str] | None = None
	pubsub = None
	client = None
	try:
		try:
			client = _get_redis_client()
			pubsub = client.pubsub(ignore_subscribe_messages=True)
			pubsub.subscribe(_channel_name(residence_id))
		except redis.RedisError:
			pubsub = None
			# Fallback local si Redis no esta disponible.
			local_queue = _subscribe_local(residence_id)

		# Sugerencia de reconexion para el navegador.
		yield "retry: 5000\n\n"

		last_ping = time.monotonic()
		while True:
			if local_queue is not None:
				try:
					local_data = local_queue.get(timeout=1.0)
					yield f"data: {local_data}\n\n"
				except Empty:
					pass

			if pubsub is not None:
				message = pubsub.get_message(timeout=0.01)
				if message and message.get("type") == "message":
					data = message.get("data")
					yield f"data: {data}\n\n"

			now = time.monotonic()
			if now - last_ping >= keepalive_seconds:
				yield "event: ping\ndata: {}\n\n"
				last_ping = now
	except GeneratorExit:
		return
	finally:
		if local_queue is not None:
			_unsubscribe_local(residence_id, local_queue)
		if pubsub is not None:
			pubsub.close()