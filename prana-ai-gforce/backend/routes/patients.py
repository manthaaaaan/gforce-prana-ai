from fastapi import APIRouter, HTTPException, Depends
from typing import List

from context import context, UserRole
from models import (
    PatientCreate, PatientUpdate, PatientResponse, 
    EmergencyContact, UserResponse
)
from auth import get_current_user, require_role

router = APIRouter(prefix="/patients", tags=["patients"])

@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: str, current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_id(patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role == UserRole.patient:
        patient_doc = context.get_patient_by_user_id(current_user.id)
        if not patient_doc or patient_doc.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        age=patient.age,
        gender=patient.gender,
        chronic_conditions=patient.chronic_conditions,
        doctor_id=patient.doctor_id,
        emergency_contacts=patient.emergency_contacts,
        name=patient.name
    )

@router.put("/{patient_id}", response_model=PatientResponse)
async def update_patient(patient_id: str, update: PatientUpdate, current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_id(patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    if current_user.role == UserRole.patient:
        patient_doc = context.get_patient_by_user_id(current_user.id)
        if not patient_doc or patient_doc.id != patient_id:
            raise HTTPException(status_code=403, detail="Access denied")
    
    update_data = {k: v for k, v in update.model_dump().items() if v is not None}
    context.update_patient(patient_id, **update_data)
    
    patient = context.get_patient_by_id(patient_id)
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        age=patient.age,
        gender=patient.gender,
        chronic_conditions=patient.chronic_conditions,
        doctor_id=patient.doctor_id,
        emergency_contacts=patient.emergency_contacts,
        name=patient.name
    )

@router.post("/emergency-contact", response_model=PatientResponse)
async def add_emergency_contact(
    patient_id: str, 
    contact: EmergencyContact, 
    current_user: UserResponse = Depends(require_role(UserRole.patient))
):
    patient = context.get_patient_by_id(patient_id)
    
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    
    patient_doc = context.get_patient_by_user_id(current_user.id)
    if not patient_doc or patient_doc.id != patient_id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    patient.emergency_contacts.append(contact.model_dump())
    
    return PatientResponse(
        id=patient.id,
        user_id=patient.user_id,
        age=patient.age,
        gender=patient.gender,
        chronic_conditions=patient.chronic_conditions,
        doctor_id=patient.doctor_id,
        emergency_contacts=patient.emergency_contacts,
        name=patient.name
    )

@router.get("/", response_model=List[PatientResponse])
async def list_patients(current_user: UserResponse = Depends(require_role(UserRole.doctor))):
    patient_list = context.get_patients_by_doctor(current_user.id)
    
    return [
        PatientResponse(
            id=p.id,
            user_id=p.user_id,
            age=p.age,
            gender=p.gender,
            chronic_conditions=p.chronic_conditions,
            doctor_id=p.doctor_id,
            emergency_contacts=p.emergency_contacts,
            name=p.name
        )
        for p in patient_list
    ]