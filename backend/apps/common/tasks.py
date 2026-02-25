from config.celery import app


@app.task(bind=True)
def ping(self):
    return {
        "task_id": self.request.id,
        "status": "pong",
    }
