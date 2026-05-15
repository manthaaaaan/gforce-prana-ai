from fastapi import APIRouter, Request
from typing import Dict
from agents import agent_manager

router = APIRouter(prefix="/agents", tags=["agents"])


@router.post("/submit")
async def submit_task(body: Dict):
    name = body.get("name")
    payload = body.get("payload", {})
    if not name:
        return {"error": "name is required"}
    task_id = agent_manager.create_task(name, payload)
    return {"task_id": task_id}


@router.get("/status/{task_id}")
async def task_status(task_id: str):
    # simple direct DB read
    import sqlite3, os, json
    db_path = os.path.join(os.path.dirname(__file__), "..", "agents", "tasks.db")
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute("SELECT id, name, status, result FROM tasks WHERE id = ?", (task_id,))
    row = c.fetchone()
    conn.close()
    if not row:
        return {"error": "not_found"}
    return {"id": row[0], "name": row[1], "status": row[2], "result": json.loads(row[3]) if row[3] else None}


@router.post("/webhook")
async def webhook_receiver(request: Request):
    event = await request.json()
    # Basic mapping: create a task from webhook type
    event_type = event.get("type", "webhook_event")
    payload = event.get("data", {})
    task_id = agent_manager.create_task(event_type, {"input": payload})
    return {"enqueued": task_id}
