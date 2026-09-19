from __future__ import annotations

import threading
import traceback
import uuid
from copy import deepcopy
from typing import Any, Callable


class JobManager:
    def __init__(self):
        self._jobs: dict[str, dict[str, Any]] = {}
        self._lock = threading.RLock()

    def start(self, worker: Callable[[Callable[[str, int, str], None]], Any]) -> str:
        job_id = str(uuid.uuid4())
        with self._lock:
            self._jobs[job_id] = {
                "id": job_id,
                "status": "queued",
                "step": "queued",
                "progress": 0,
                "message": "En attente",
                "result": None,
                "error": None,
            }

        def progress(step: str, pct: int, message: str) -> None:
            with self._lock:
                job = self._jobs[job_id]
                job.update(status="running", step=step, progress=max(0, min(100, int(pct))), message=message)

        def run() -> None:
            progress("starting", 1, "Démarrage")
            try:
                result = worker(progress)
                with self._lock:
                    self._jobs[job_id].update(
                        status="done", step="done", progress=100, message="Terminé", result=result
                    )
            except Exception as exc:
                with self._lock:
                    self._jobs[job_id].update(
                        status="error",
                        step="error",
                        message=str(exc),
                        error=str(exc),
                        trace=traceback.format_exc(limit=10),
                    )

        threading.Thread(target=run, name=f"nexus-job-{job_id[:8]}", daemon=True).start()
        return job_id

    def get(self, job_id: str) -> dict[str, Any] | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return deepcopy(job) if job else None
