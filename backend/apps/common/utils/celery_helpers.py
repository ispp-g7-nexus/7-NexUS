from celery import Task, shared_task


class BaseRetryTask(Task):
    autoretry_for = (Exception,)
    retry_backoff = True
    retry_backoff_max = 60
    retry_jitter = True
    max_retries = 5


def shared_retry_task(*task_args, **task_kwargs):
    task_kwargs.setdefault("bind", True)
    task_kwargs.setdefault("base", BaseRetryTask)

    return shared_task(*task_args, **task_kwargs)
