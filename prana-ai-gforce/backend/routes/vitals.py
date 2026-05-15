from fastapi import APIRouter, HTTPException, Depends, status
from datetime import datetime
from typing import List

from context import context
from models import VitalsCreate, VitalsResponse, UserResponse, HeartFailureVitals, HeartFailureVitalsResponse
from auth import get_current_user
from services.prediction import predictor
from services.alert import alert_service

router = APIRouter(prefix="/vitals", tags=["vitals"])

@router.post("", response_model=VitalsResponse, status_code=status.HTTP_201_CREATED)
async def submit_vitals(vitals: VitalsCreate, current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    vitals_data = {
        "heart_rate": vitals.heart_rate,
        "bp_systolic": vitals.bp_systolic,
        "bp_diastolic": vitals.bp_diastolic,
        "spo2": vitals.spo2,
        "glucose": vitals.glucose,
        "sleep_hours": vitals.sleep_hours,
        "steps": vitals.steps,
        "medication_taken": vitals.medication_taken
    }
    
    saved_vitals = context.add_vitals(patient.id, vitals_data, "general")
    
    prediction_result = predictor.predict(vitals_data)
    
    context.add_prediction(
        patient.id,
        prediction_result["risk_score"],
        prediction_result["risk_level"],
        prediction_result["explanation"]
    )
    
    alert_service.process_alert(
        patient.id,
        prediction_result["risk_score"],
        prediction_result["risk_level"],
        prediction_result["explanation"]
    )
    
    return VitalsResponse(
        id=saved_vitals.id,
        patient_id=patient.id,
        heart_rate=vitals.heart_rate,
        bp_systolic=vitals.bp_systolic,
        bp_diastolic=vitals.bp_diastolic,
        spo2=vitals.spo2,
        glucose=vitals.glucose,
        sleep_hours=vitals.sleep_hours,
        steps=vitals.steps,
        medication_taken=vitals.medication_taken,
        timestamp=saved_vitals.timestamp
    )

@router.get("", response_model=List[VitalsResponse])
async def get_vitals(
    limit: int = 10, 
    current_user: UserResponse = Depends(get_current_user)
):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    vitals_list = context.get_vitals(patient.id, limit, "general")
    
    return [
        VitalsResponse(
            id=v.id,
            patient_id=v.patient_id,
            heart_rate=v.data.get("heart_rate", 0),
            bp_systolic=v.data.get("bp_systolic", 0),
            bp_diastolic=v.data.get("bp_diastolic", 0),
            spo2=v.data.get("spo2", 0),
            glucose=v.data.get("glucose", 0),
            sleep_hours=v.data.get("sleep_hours", 0),
            steps=v.data.get("steps", 0),
            medication_taken=v.data.get("medication_taken", True),
            timestamp=v.timestamp
        )
        for v in vitals_list
    ]

@router.post("/heart-failure", response_model=HeartFailureVitalsResponse, status_code=status.HTTP_201_CREATED)
async def submit_heart_failure_vitals(vitals: HeartFailureVitals, current_user: UserResponse = Depends(get_current_user)):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    vitals_data = vitals.model_dump()
    
    saved_vitals = context.add_vitals(patient.id, vitals_data, "heart_failure")
    
    prediction_result = predictor.predict(vitals_data)
    
    context.add_prediction(
        patient.id,
        prediction_result["risk_score"],
        prediction_result["risk_level"],
        prediction_result["explanation"]
    )
    
    return HeartFailureVitalsResponse(
        id=saved_vitals.id,
        patient_id=patient.id,
        age=vitals.age,
        anaemia=vitals.anaemia,
        creatinine_phosphokinase=vitals.creatinine_phosphokinase,
        diabetes=vitals.diabetes,
        ejection_fraction=vitals.ejection_fraction,
        high_blood_pressure=vitals.high_blood_pressure,
        platelets=vitals.platelets,
        serum_creatinine=vitals.serum_creatinine,
        serum_sodium=vitals.serum_sodium,
        sex=vitals.sex,
        smoking=vitals.smoking,
        time=vitals.time,
        timestamp=saved_vitals.timestamp
    )

@router.get("/heart-failure", response_model=List[HeartFailureVitalsResponse])
async def get_heart_failure_vitals(
    limit: int = 10, 
    current_user: UserResponse = Depends(get_current_user)
):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    vitals_list = context.get_vitals(patient.id, limit, "heart_failure")
    
    return [
        HeartFailureVitalsResponse(
            id=v.id,
            patient_id=v.patient_id,
            age=v.data.get("age", 0),
            anaemia=v.data.get("anaemia", 0),
            creatinine_phosphokinase=v.data.get("creatinine_phosphokinase", 0),
            diabetes=v.data.get("diabetes", 0),
            ejection_fraction=v.data.get("ejection_fraction", 0),
            high_blood_pressure=v.data.get("high_blood_pressure", 0),
            platelets=v.data.get("platelets", 0),
            serum_creatinine=v.data.get("serum_creatinine", 0),
            serum_sodium=v.data.get("serum_sodium", 0),
            sex=v.data.get("sex", 0),
            smoking=v.data.get("smoking", 0),
            time=v.data.get("time", 0),
            timestamp=v.timestamp
        )
        for v in vitals_list
    ]