from fastapi import APIRouter, HTTPException, Request
from typing import List
from context import context
from agents import agent_manager
import json

router = APIRouter(prefix="/consultations", tags=["consultations"])


@router.get("")
async def list_consultations():
    # return all consultations across patients
    all_cons = []
    for pid, clist in context.consultations.items():
        for c in clist:
            all_cons.append(c)
    return all_cons


@router.get("/{consultation_id}")
async def get_consultation(consultation_id: str):
    for pid, clist in context.consultations.items():
        for c in clist:
            if c["id"] == consultation_id:
                return c
    raise HTTPException(status_code=404, detail="consultation not found")


@router.post("")
async def create_consultation(req: Request):
    body = await req.json()
    patient_id = body.get("patient_id")
    if not patient_id or patient_id not in context.patients:
        raise HTTPException(status_code=400, detail="invalid patient_id")
    messages = body.get("messages", [])
    doctor_id = body.get("doctor_id")
    language = body.get("language", "en")
    c = context.add_consultation(patient_id, doctor_id, messages, language)
    return c


@router.post("/{consultation_id}/prescribe")
async def prescribe(consultation_id: str, req: Request):
    body = await req.json()
    medicines = body.get("medicines", [])
    prescribed_by = body.get("prescribed_by")
    # validate consultation exists
    found = None
    for pid, clist in context.consultations.items():
        for c in clist:
            if c["id"] == consultation_id:
                found = c
                break
    if not found:
        raise HTTPException(status_code=404, detail="consultation not found")

    pres = context.add_prescription(consultation_id, prescribed_by, medicines)

    # enqueue drug conflict check agent
    task_payload = {"prescription": pres}
    task_id = agent_manager.create_task("drug_conflict_check", task_payload)

    return {"prescription": pres, "conflict_check_task_id": task_id}
    

@router.post("/analyze-transcript")
async def analyze_transcript(req: Request):
    body = await req.json()
    transcript = body.get("transcript")
    patient_id = body.get("patient_id", "demo-patient")
    
    # Get patient context
    patient = context.patients.get(patient_id)
    patient_data = {
        "id": patient.id,
        "name": patient.name,
        "medications": patient.medications,
        "conditions": patient.conditions
    } if patient else {"id": "demo-patient", "name": "Demo", "medications": ["Aspirin"], "conditions": ["HF"]}

    task_payload = {
        "transcript": transcript,
        "patient_context": patient_data
    }
    
    task_id = agent_manager.create_task("consultation_analysis", task_payload)
    return {"task_id": task_id, "status": "queued"}
