from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime
from typing import List

from context import context
from models import PredictionResponse, UserResponse, VitalsCreate
from auth import get_current_user

router = APIRouter(prefix="/predict", tags=["prediction"])

@router.post("/risk", response_model=PredictionResponse)
async def predict_risk(vitals_data: dict, current_user: UserResponse = Depends(get_current_user)):
    from services.prediction import predictor
    
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    result = predictor.predict(vitals_data)
    
    created_at = datetime.utcnow()
    prediction = context.add_prediction(
        patient.id,
        result["risk_score"],
        result["risk_level"],
        result["explanation"]
    )
    
    return PredictionResponse(
        patient_id=patient.id,
        risk_score=result["risk_score"],
        risk_level=result["risk_level"],
        explanation=result["explanation"],
        created_at=prediction.created_at
    )

@router.get("/history", response_model=List[PredictionResponse])
async def get_prediction_history(
    limit: int = 10, 
    current_user: UserResponse = Depends(get_current_user)
):
    patient = context.get_patient_by_user_id(current_user.id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
    
    pred_list = context.get_predictions(patient.id, limit)
    
    return [
        PredictionResponse(
            patient_id=p.patient_id,
            risk_score=p.risk_score,
            risk_level=p.risk_level,
            explanation=p.explanation,
            created_at=p.created_at
        )
        for p in pred_list
    ]