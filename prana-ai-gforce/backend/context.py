from typing import Dict, List, Optional
from datetime import datetime
from enum import Enum
import uuid

class UserRole(str, Enum):
    patient = "patient"
    doctor = "doctor"

class RiskLevel(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class AlertType(str, Enum):
    warning = "warning"
    emergency = "emergency"

class AlertStatus(str, Enum):
    sent = "sent"
    delivered = "delivered"
    failed = "failed"

class User:
    def __init__(self, id: str, name: str, email: str, phone: str, password_hash: str, role: UserRole):
        self.id = id
        self.name = name
        self.email = email
        self.phone = phone
        self.password_hash = password_hash
        self.role = role

class Patient:
    def __init__(self, id: str, user_id: str, name: str, age: int = 0, gender: str = "other", 
                 chronic_conditions: List[str] = None, doctor_id: str = None, emergency_contacts: List[Dict] = None):
        self.id = id
        self.user_id = user_id
        self.name = name
        self.age = age
        self.gender = gender
        self.chronic_conditions = chronic_conditions or []
        self.doctor_id = doctor_id
        self.emergency_contacts = emergency_contacts or []

class Vitals:
    def __init__(self, id: str, patient_id: str, data: Dict, vitals_type: str = "general", timestamp: datetime = None):
        self.id = id
        self.patient_id = patient_id
        self.data = data
        self.vitals_type = vitals_type
        self.timestamp = timestamp or datetime.utcnow()

class Prediction:
    def __init__(self, id: str, patient_id: str, risk_score: float, risk_level: RiskLevel, 
                 explanation: List[str], created_at: datetime = None):
        self.id = id
        self.patient_id = patient_id
        self.risk_score = risk_score
        self.risk_level = risk_level
        self.explanation = explanation
        self.created_at = created_at or datetime.utcnow()

class Alert:
    def __init__(self, id: str, patient_id: str, alert_type: AlertType, message: str, 
                 sent_to: List[str], status: AlertStatus, timestamp: datetime = None):
        self.id = id
        self.patient_id = patient_id
        self.alert_type = alert_type
        self.message = message
        self.sent_to = sent_to
        self.status = status
        self.timestamp = timestamp or datetime.utcnow()

class BackendContext:
    def __init__(self):
        self.users: Dict[str, User] = {}
        self.patients: Dict[str, Patient] = {}
        self.vitals: Dict[str, List[Vitals]] = {}
        self.predictions: Dict[str, List[Prediction]] = {}
        self.alerts: Dict[str, List[Alert]] = {}
        
    def create_user(self, name: str, email: str, phone: str, password_hash: str, role: UserRole) -> User:
        user_id = str(uuid.uuid4())
        user = User(user_id, name, email, phone, password_hash, role)
        self.users[user_id] = user
        
        if role == UserRole.patient:
            patient_id = str(uuid.uuid4())
            patient = Patient(patient_id, user_id, name)
            self.patients[patient_id] = patient
            self.vitals[patient_id] = []
            self.predictions[patient_id] = []
            self.alerts[patient_id] = []
        
        return user
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        for user in self.users.values():
            if user.email == email:
                return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        return self.users.get(user_id)
    
    def get_patient_by_user_id(self, user_id: str) -> Optional[Patient]:
        for patient in self.patients.values():
            if patient.user_id == user_id:
                return patient
        return None
    
    def get_patient_by_id(self, patient_id: str) -> Optional[Patient]:
        return self.patients.get(patient_id)
    
    def get_patients_by_doctor(self, doctor_id: str) -> List[Patient]:
        return [p for p in self.patients.values() if p.doctor_id == doctor_id]
    
    def update_patient(self, patient_id: str, **kwargs) -> Optional[Patient]:
        patient = self.patients.get(patient_id)
        if patient:
            for key, value in kwargs.items():
                if hasattr(patient, key) and value is not None:
                    setattr(patient, key, value)
        return patient
    
    def add_vitals(self, patient_id: str, data: Dict, vitals_type: str = "general") -> Vitals:
        if patient_id not in self.vitals:
            self.vitals[patient_id] = []
        
        vitals_id = str(uuid.uuid4())
        vitals = Vitals(vitals_id, patient_id, data, vitals_type)
        self.vitals[patient_id].append(vitals)
        return vitals
    
    def get_vitals(self, patient_id: str, limit: int = 10, vitals_type: str = None) -> List[Vitals]:
        if patient_id not in self.vitals:
            return []
        
        vitals_list = self.vitals[patient_id]
        if vitals_type:
            vitals_list = [v for v in vitals_list if v.vitals_type == vitals_type]
        
        return vitals_list[-limit:][::-1]
    
    def add_prediction(self, patient_id: str, risk_score: float, risk_level: RiskLevel, 
                       explanation: List[str]) -> Prediction:
        if patient_id not in self.predictions:
            self.predictions[patient_id] = []
        
        pred_id = str(uuid.uuid4())
        prediction = Prediction(pred_id, patient_id, risk_score, risk_level, explanation)
        self.predictions[patient_id].append(prediction)
        return prediction
    
    def get_predictions(self, patient_id: str, limit: int = 10) -> List[Prediction]:
        if patient_id not in self.predictions:
            return []
        return self.predictions[patient_id][-limit:][::-1]
    
    def add_alert(self, patient_id: str, alert_type: AlertType, message: str, sent_to: List[str]) -> Alert:
        if patient_id not in self.alerts:
            self.alerts[patient_id] = []
        
        alert_id = str(uuid.uuid4())
        alert = Alert(alert_id, patient_id, alert_type, message, sent_to, AlertStatus.sent)
        self.alerts[patient_id].append(alert)
        return alert
    
    def get_alerts(self, patient_id: str, limit: int = 50) -> List[Alert]:
        if patient_id not in self.alerts:
            return []
        return self.alerts[patient_id][-limit:][::-1]
    
    def clear_all(self):
        self.users.clear()
        self.patients.clear()
        self.vitals.clear()
        self.predictions.clear()
        self.alerts.clear()

context = BackendContext()