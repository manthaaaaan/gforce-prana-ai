from typing import Any, Dict

from fastapi import APIRouter, HTTPException

from agents import agent_manager

router = APIRouter(prefix="/clinical", tags=["clinical-autonomy"])


@router.post("/start")
async def start_clinical_workflow(body: Dict[str, Any] | None = None):
    payload = body or {}
    payload.setdefault("source", "manual_demo")
    task_id = agent_manager.create_task("clinical_pipeline", payload)
    return {
        "workflow_id": task_id,
        "task_id": task_id,
        "status": "queued",
        "message": "Autonomous clinical workflow queued.",
    }


@router.post("/webhook/vitals")
async def vitals_webhook(event: Dict[str, Any]):
    payload = {
        "source": event.get("source", "external_vitals_webhook"),
        "event": event.get("type", "vitals.changed"),
        "patient": event.get("patient", {}),
        "vitals": event.get("vitals", {}),
        "raw_event": event,
    }
    task_id = agent_manager.create_task("clinical_pipeline", payload)
    return {
        "accepted": True,
        "workflow_id": task_id,
        "task_id": task_id,
    }


@router.get("/workflows")
async def list_workflows(limit: int = 20):
    return agent_manager.list_tasks("clinical_pipeline", limit)


@router.get("/workflows/{workflow_id}")
async def get_workflow(workflow_id: str):
    task = agent_manager.get_task(workflow_id)
    if not task:
        raise HTTPException(status_code=404, detail="workflow not found")
    return {
        "task": task,
        "events": agent_manager.list_events(workflow_id),
        "tool_calls": agent_manager.list_tool_calls(workflow_id),
    }
