import os
import sqlite3
import json
import uuid
import asyncio
import logging
from typing import Callable, Dict, Any, List

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(__file__), "tasks.db")


class AgentManager:
    def __init__(self, db_path: str = DB_PATH):
        self.db_path = db_path
        self.handlers: Dict[str, Callable[[Dict[str, Any]], Any]] = {}
        self._ensure_db()

    def _conn(self):
        return sqlite3.connect(self.db_path, timeout=30)

    def _ensure_db(self):
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY,
                name TEXT,
                payload TEXT,
                status TEXT,
                result TEXT,
                created_at REAL,
                updated_at REAL
            )
            """
        )
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS workflow_events (
                id TEXT PRIMARY KEY,
                workflow_id TEXT,
                agent TEXT,
                kind TEXT,
                status TEXT,
                summary TEXT,
                payload TEXT,
                created_at REAL
            )
            """
        )
        c.execute(
            """
            CREATE TABLE IF NOT EXISTS tool_calls (
                id TEXT PRIMARY KEY,
                workflow_id TEXT,
                agent TEXT,
                tool_name TEXT,
                input TEXT,
                output TEXT,
                status TEXT,
                created_at REAL
            )
            """
        )
        conn.commit()
        conn.close()

    def create_task(self, name: str, payload: Dict[str, Any]) -> str:
        task_id = str(uuid.uuid4())
        if name == "clinical_pipeline" and "workflow_id" not in payload:
            payload = {**payload, "workflow_id": task_id}
        now = self._now()
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            "INSERT INTO tasks (id, name, payload, status, result, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (task_id, name, json.dumps(payload), "pending", "", now, now),
        )
        conn.commit()
        conn.close()
        logger.info(f"Created task {task_id} name={name}")
        return task_id

    def _now(self) -> float:
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                return loop.time()
        except RuntimeError:
            pass
        import time
        return time.time()

    def get_pending(self, limit: int = 5) -> List[Dict[str, Any]]:
        conn = self._conn()
        c = conn.cursor()
        c.execute("SELECT id, name, payload FROM tasks WHERE status = 'pending' ORDER BY created_at LIMIT ?", (limit,))
        rows = c.fetchall()
        conn.close()
        tasks = []
        for r in rows:
            tasks.append({"id": r[0], "name": r[1], "payload": json.loads(r[2])})
        return tasks

    def set_status(self, task_id: str, status: str, result: Any = None):
        conn = self._conn()
        c = conn.cursor()
        res_text = json.dumps(result) if result is not None else ""
        now = self._now()
        c.execute("UPDATE tasks SET status = ?, result = ?, updated_at = ? WHERE id = ?", (status, res_text, now, task_id))
        conn.commit()
        conn.close()
        logger.info(f"Task {task_id} set status={status}")

    def get_task(self, task_id: str) -> Dict[str, Any] | None:
        conn = self._conn()
        c = conn.cursor()
        c.execute("SELECT id, name, payload, status, result, created_at, updated_at FROM tasks WHERE id = ?", (task_id,))
        row = c.fetchone()
        conn.close()
        if not row:
            return None
        return {
            "id": row[0],
            "name": row[1],
            "payload": json.loads(row[2]) if row[2] else {},
            "status": row[3],
            "result": json.loads(row[4]) if row[4] else None,
            "created_at": row[5],
            "updated_at": row[6],
        }

    def list_tasks(self, name: str | None = None, limit: int = 20) -> List[Dict[str, Any]]:
        conn = self._conn()
        c = conn.cursor()
        if name:
            c.execute(
                "SELECT id, name, payload, status, result, created_at, updated_at FROM tasks WHERE name = ? ORDER BY created_at DESC LIMIT ?",
                (name, limit),
            )
        else:
            c.execute(
                "SELECT id, name, payload, status, result, created_at, updated_at FROM tasks ORDER BY created_at DESC LIMIT ?",
                (limit,),
            )
        rows = c.fetchall()
        conn.close()
        return [
            {
                "id": row[0],
                "name": row[1],
                "payload": json.loads(row[2]) if row[2] else {},
                "status": row[3],
                "result": json.loads(row[4]) if row[4] else None,
                "created_at": row[5],
                "updated_at": row[6],
            }
            for row in rows
        ]

    def add_event(self, workflow_id: str, agent: str, kind: str, status: str, summary: str, payload: Any = None):
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            "INSERT INTO workflow_events (id, workflow_id, agent, kind, status, summary, payload, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), workflow_id, agent, kind, status, summary, json.dumps(payload or {}), self._now()),
        )
        conn.commit()
        conn.close()

    def list_events(self, workflow_id: str) -> List[Dict[str, Any]]:
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            "SELECT id, agent, kind, status, summary, payload, created_at FROM workflow_events WHERE workflow_id = ? ORDER BY created_at ASC",
            (workflow_id,),
        )
        rows = c.fetchall()
        conn.close()
        return [
            {
                "id": row[0],
                "agent": row[1],
                "kind": row[2],
                "status": row[3],
                "summary": row[4],
                "payload": json.loads(row[5]) if row[5] else {},
                "created_at": row[6],
            }
            for row in rows
        ]

    def add_tool_call(self, workflow_id: str, agent: str, tool_name: str, tool_input: Any, output: Any, status: str = "completed"):
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            "INSERT INTO tool_calls (id, workflow_id, agent, tool_name, input, output, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (str(uuid.uuid4()), workflow_id, agent, tool_name, json.dumps(tool_input or {}), json.dumps(output or {}), status, self._now()),
        )
        conn.commit()
        conn.close()

    def list_tool_calls(self, workflow_id: str) -> List[Dict[str, Any]]:
        conn = self._conn()
        c = conn.cursor()
        c.execute(
            "SELECT id, agent, tool_name, input, output, status, created_at FROM tool_calls WHERE workflow_id = ? ORDER BY created_at ASC",
            (workflow_id,),
        )
        rows = c.fetchall()
        conn.close()
        return [
            {
                "id": row[0],
                "agent": row[1],
                "tool_name": row[2],
                "input": json.loads(row[3]) if row[3] else {},
                "output": json.loads(row[4]) if row[4] else {},
                "status": row[5],
                "created_at": row[6],
            }
            for row in rows
        ]

    def register_handler(self, name: str, fn: Callable[[Dict[str, Any]], Any]):
        self.handlers[name] = fn
        logger.info(f"Registered handler for {name}")

    async def execute_task(self, task: Dict[str, Any]):
        task_id = task["id"]
        name = task["name"]
        payload = task.get("payload", {})

        handler = self.handlers.get(name)
        if not handler:
            self.set_status(task_id, "failed", {"error": "no handler"})
            return

        self.set_status(task_id, "running")

        try:
            result = handler(payload)
            if asyncio.iscoroutine(result):
                result = await result
            self.set_status(task_id, "completed", result)
        except Exception as e:
            logger.exception("Agent handler failed")
            self.set_status(task_id, "failed", {"error": str(e)})


agent_manager = AgentManager()

try:
    # Register a simple built-in handler that delegates to the prediction service
    from services.prediction import predictor

    def _predict_handler(payload: Dict[str, Any]):
        return predictor.predict(payload.get("input", {}))

    agent_manager.register_handler("predict_risk", _predict_handler)
except Exception:
    logger.info("Prediction service not available at import time; skip registering predict_risk")


def _drug_conflict_handler(payload: Dict[str, Any]):
    # payload expected: { prescription: { medicines: [ {medicineName, dosage, ...}, ... ] } }
    pres = payload.get("prescription") or payload.get("prescriptions") or payload
    meds = pres.get("medicines", []) if isinstance(pres, dict) else []

    # Very small mock interaction DB
    interactions = {
        ("aspirin", "warfarin"): "Increased bleeding risk when combined.",
        ("metformin", "contrast dye"): "Risk of lactic acidosis with iodinated contrast.",
        ("amlodipine", "simvastatin"): "Simvastatin levels may increase when used with amlodipine.",
        ("salbutamol", "beta_blocker"): "Reduced bronchodilator effect when taken with non-selective beta blockers."
    }

    names = [m.get("medicineName", "").lower() for m in meds]
    conflicts = []
    for i in range(len(names)):
        for j in range(i+1, len(names)):
            pair = (names[i], names[j])
            pair_rev = (names[j], names[i])
            if pair in interactions:
                conflicts.append({"pair": pair, "message": interactions[pair]})
            elif pair_rev in interactions:
                conflicts.append({"pair": pair_rev, "message": interactions[pair_rev]})

    return {"conflicts": conflicts, "count": len(conflicts)}


agent_manager.register_handler("drug_conflict_check", _drug_conflict_handler)

try:
    from agents.clinical_pipeline import clinical_pipeline_handler
    agent_manager.register_handler("clinical_pipeline", clinical_pipeline_handler)
except Exception as exc:
    logger.exception("Clinical pipeline handler failed to register: %s", exc)

try:
    from agents.consultation_agent import consultation_handler
    agent_manager.register_handler("consultation_analysis", consultation_handler)
except Exception as exc:
    logger.exception("Consultation handler failed to register: %s", exc)

try:
    from agents.twilio_agent import twilio_alert_handler
    agent_manager.register_handler("twilio_alert", twilio_alert_handler)
except Exception as exc:
    logger.exception("Twilio alert handler failed to register: %s", exc)

