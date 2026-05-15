from fastapi import APIRouter, HTTPException, Depends
from typing import List

from context import context, UserRole, AlertType, AlertStatus
from models import AlertResponse, UserResponse
from auth import get_current_user

router = APIRouter(prefix="/alerts", tags=["alerts"])

@router.get("/{patient_id}", response_model=List[AlertResponse])
async def get_alerts(patient_id: str, current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_id(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role == UserRole.patient:
        patient_doc = context.get_patient_by_user_id(current_user.id)
        if not patient_doc or patient_doc.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    alert_list = context.get_alerts(patient_id, 50)
    
    return [
        AlertResponse(
            id=a.id,
            patient_id=a.patient_id,
            type=a.alert_type,
            message=a.message,
            sent_to=a.sent_to,
            status=a.status,
            timestamp=a.timestamp
        )
        for a in alert_list
    ]

@router.get("/", response_model=List[AlertResponse])
async def get_my_alerts(current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        return []
    
    alert_list = context.get_alerts(patient.id, 50)
    
    return [
        AlertResponse(
            id=a.id,
            patient_id=a.patient_id,
            type=a.alert_type,
            message=a.message,
            sent_to=a.sent_to,
            status=a.status,
            timestamp=a.timestamp
        )
        for a in alert_list
    ]