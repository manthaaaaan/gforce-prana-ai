import asyncio
import logging
from .manager import agent_manager

logger = logging.getLogger(__name__)

_worker_task = None
_stop_event = asyncio.Event()


async def _loop():
    while not _stop_event.is_set():
        try:
            tasks = agent_manager.get_pending(limit=5)
            if not tasks:
                await asyncio.sleep(1)
                continue

            for t in tasks:
                await agent_manager.execute_task(t)

        except Exception as e:
            logger.exception("Agent worker loop error")
        await asyncio.sleep(0.1)


async def start_background_worker(app=None):
    global _worker_task
    if _worker_task and not _worker_task.done():
        return _worker_task
    
    # Crash safety: Reset tasks that were stuck in 'running' state
    try:
        import sqlite3, os
        db_path = os.path.join(os.path.dirname(__file__), "tasks.db")
        if os.path.exists(db_path):
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            c.execute("UPDATE tasks SET status = 'pending' WHERE status = 'running'")
            conn.commit()
            conn.close()
            logger.info("Crash recovery: Reset stuck tasks to pending")
    except Exception as e:
        logger.error(f"Failed to reset stuck tasks: {e}")

    _stop_event.clear()
    _worker_task = asyncio.create_task(_loop())
    logger.info("Agent background worker started")
    return _worker_task


async def stop_background_worker():
    _stop_event.set()
    global _worker_task
    if _worker_task:
        _worker_task.cancel()
        try:
            await _worker_task
        except asyncio.CancelledError:
            pass
    logger.info("Agent background worker stopped")
