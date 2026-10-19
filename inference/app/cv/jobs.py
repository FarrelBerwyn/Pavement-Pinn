"""Asynchronous CV jobs: the stage a job reports is the stage the engine is executing."""
from __future__ import annotations

import threading
import time
import uuid
from collections import OrderedDict

from .engine import CvError, analyze_image

MAX_JOBS = 200
_jobs: "OrderedDict[str, dict]" = OrderedDict()
_lock = threading.Lock()
_worker = threading.Semaphore(1)  # one inference at a time on this CPU


def _set(job_id: str, **fields):
    with _lock:
        if job_id in _jobs:
            _jobs[job_id].update(fields, updatedAt=time.time())


def _run(job_id: str, data: bytes):
    with _worker:
        try:
            _set(job_id, state="running")
            result = analyze_image(data, stage=lambda s: _set(job_id, stage=s, stages=_jobs[job_id]["stages"] + [s]))
            _set(job_id, state="done", stage="done", result=result)
        except CvError as exc:
            _set(job_id, state="error", error={"code": exc.code, "message": exc.message})
        except Exception as exc:  # never report an unexpected crash as a detection result
            _set(job_id, state="error", error={"code": "INFERENCE_FAILED", "message": f"Unexpected engine error: {exc}"})


def submit(data: bytes) -> dict:
    job_id = f"CVJ-{uuid.uuid4().hex[:16].upper()}"
    with _lock:
        while len(_jobs) >= MAX_JOBS:
            _jobs.popitem(last=False)
        _jobs[job_id] = {"jobId": job_id, "state": "queued", "stage": "queued", "stages": [], "createdAt": time.time(), "updatedAt": time.time()}
    threading.Thread(target=_run, args=(job_id, data), daemon=True).start()
    return get(job_id)


def get(job_id: str) -> dict | None:
    with _lock:
        job = _jobs.get(job_id)
        return None if job is None else dict(job)
