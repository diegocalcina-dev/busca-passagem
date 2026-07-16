import os
import logging
from typing import Optional
from apscheduler.schedulers.background import BackgroundScheduler
from engine.collector import run_collection_cycle

logger = logging.getLogger("scheduler")
_scheduler = BackgroundScheduler(timezone="America/Sao_Paulo")


def start_scheduler():
    interval_hours = int(os.getenv("COLLECTION_INTERVAL_HOURS", "6"))
    _scheduler.add_job(run_collection_cycle, "interval", hours=interval_hours, id="collect_cycle")
    _scheduler.start()
    logger.info(f"[scheduler] iniciado — coleta a cada {interval_hours}h")


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("[scheduler] encerrado")


def get_next_run() -> Optional[str]:
    job = _scheduler.get_job("collect_cycle")
    if job and job.next_run_time:
        return job.next_run_time.isoformat()
    return None
