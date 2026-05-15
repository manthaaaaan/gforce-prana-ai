from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from enum import Enum

class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"

class Gender(str, Enum):
    male = "male"
    female = "female"
    other = "other"

class AlertType(str, Enum):
    warning = "warning"
    emergency = "emergency"

class AlertStatus(str, Enum):
    sent = "sent"
    delivered = "delivered"
    failed = "failed"

class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    password: str
    role: UserRole

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    role: UserRole

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relation: str

class PatientCreate(BaseModel):
    age: int
    gender: Gender
    chronic_conditions: List[str] = []
    doctor_id: Optional[str] = None

class PatientUpdate(BaseModel):
    age: Optional[int] = None
    gender: Optional[Gender] = None
    chronic_conditions: Optional[List[str]] = None
    doctor_id: Optional[str] = None

class PatientResponse(BaseModel):
    id: str
    user_id: str
    age: int
    gender: Gender
    chronic_conditions: List[str]
    doctor_id: Optional[str]
    emergency_contacts: List[EmergencyContact]
    name: Optional[str] = None

class VitalsCreate(BaseModel):
    heart_rate: int
    bp_systolic: int
    bp_diastolic: int
    spo2: int
    glucose: float
    sleep_hours: float
    steps: int
    medication_taken: bool = True

class HeartFailureVitals(BaseModel):
    age: int
    anaemia: int = 0
    creatinine_phosphokinase: int = 0
    diabetes: int = 0
    ejection_fraction: int = 0
    high_blood_pressure: int = 0
    platelets: float = 0.0
    serum_creatinine: float = 0.0
    serum_sodium: int = 0
    sex: int = 0
    smoking: int = 0
    time: int = 0

class VitalsResponse(BaseModel):
    id: str
    patient_id: str
    heart_rate: int
    bp_systolic: int
    bp_diastolic: int
    spo2: int
    glucose: float
    sleep_hours: float
    steps: int
    medication_taken: bool
    timestamp: datetime

class HeartFailureVitalsResponse(BaseModel):
    id: str
    patient_id: str
    age: int
    anaemia: int
    creatinine_phosphokinase: int
    diabetes: int
    ejection_fraction: int
    high_blood_pressure: int
    platelets: float
    serum_creatinine: float
    serum_sodium: int
    sex: int
    smoking: int
    time: int
    timestamp: datetime

class PredictionResponse(BaseModel):
    patient_id: str
    risk_score: float
    risk_level: RiskLevel
    explanation: List[str]
    created_at: datetime

class AlertResponse(BaseModel):
    id: str
    patient_id: str
    type: AlertType
    message: str
    sent_to: List[str]
    status: AlertStatus
    timestamp: datetime