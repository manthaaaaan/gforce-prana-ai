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
        self.consultations: Dict[str, List] = {}
        self.prescriptions: Dict[str, List] = {}

        # Seed 3 mock patients with conversations (English, Kannada, Hindi)
        self._seed_mock_patients()
        
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
        self.consultations.clear()
        self.prescriptions.clear()

    def add_consultation(self, patient_id: str, doctor_id: Optional[str], messages: List[Dict], language: str = "en") -> Dict:
        if patient_id not in self.consultations:
            self.consultations[patient_id] = []
        cid = str(uuid.uuid4())
        consult = {
            "id": cid,
            "patient_id": patient_id,
            "doctor_id": doctor_id,
            "messages": messages,
            "language": language,
            "created_at": datetime.utcnow(),
            "prescription_id": None
        }
        self.consultations[patient_id].append(consult)
        return consult

    def get_consultations(self, patient_id: str) -> List[Dict]:
        return self.consultations.get(patient_id, [])[::-1]

    def add_prescription(self, consultation_id: str, prescribed_by: Optional[str], medicines: List[Dict]) -> Dict:
        pid = str(uuid.uuid4())
        pres = {
            "id": pid,
            "consultation_id": consultation_id,
            "prescribed_by": prescribed_by,
            "medicines": medicines,
            "created_at": datetime.utcnow()
        }
        self.prescriptions.setdefault(consultation_id, []).append(pres)
        # link to consultation
        for pats, clist in self.consultations.items():
            for c in clist:
                if c["id"] == consultation_id:
                    c["prescription_id"] = pid
        return pres

    def get_prescriptions(self, consultation_id: str) -> List[Dict]:
        return self.prescriptions.get(consultation_id, [])

    def _seed_mock_patients(self):
        # English patient
        u1 = str(uuid.uuid4())
        p1 = str(uuid.uuid4())
        self.users[u1] = User(u1, "John Doe", "john@example.com", "+11234567890", "hash", UserRole.patient)
        self.patients[p1] = Patient(p1, u1, "John Doe", age=45, gender="male", chronic_conditions=["hypertension"], doctor_id=None)
        self.vitals[p1] = []
        self.predictions[p1] = []
        self.alerts[p1] = []
        conv1 = [
            {"role": "patient", "content": "Hello doctor, I'm John Doe, 45 years old. I've had chest tightness and occasional shortness of breath.", "timestamp": datetime.utcnow()},
            {"role": "doctor", "content": "Hi John — how long have you had these symptoms? Any recent palpitations?", "timestamp": datetime.utcnow()},
            {"role": "patient", "content": "For about 3 days, yes occasional palpitations. I take amlodipine for blood pressure.", "timestamp": datetime.utcnow()}
        ]
        self.add_consultation(p1, None, conv1, language="en")

        # Kannada patient
        u2 = str(uuid.uuid4())
        p2 = str(uuid.uuid4())
        self.users[u2] = User(u2, "Aruna Rao", "aruna@example.com", "+919876543210", "hash", UserRole.patient)
        self.patients[p2] = Patient(p2, u2, "Aruna Rao", age=58, gender="female", chronic_conditions=["diabetes"], doctor_id=None)
        self.vitals[p2] = []
        self.predictions[p2] = []
        self.alerts[p2] = []
        conv2 = [
            {"role": "patient", "content": "ನಮಸ್ಕಾರ ಡಾಕ್ಟರ್, ನಾನು ಅರುಣಾ ರಾವ್, ನನ್ನ ವಯಸ್ಸು 58. ನನಗೆ ತಂದೆಯ ಹೃದಯ ಸಂಬಂಧಿ ಹಾಗೂ ತೀವ್ರ ಹುರುಪು ಇದೆ.", "timestamp": datetime.utcnow()},
            {"role": "doctor", "content": "ಏನು ಲಕ್ಷಣಗಳು ಇದ್ದವೆ? ನಿಮ್ಮ ಸಕ್ಕರೆ ನಿಯಂತ್ರಣ ಹೇಗಿದೆ?", "timestamp": datetime.utcnow()},
            {"role": "patient", "content": "ನಾನು ಹೆಚ್ಚು ಧ್ವನಿಸುಮ್ಮನ್ಬ, ತಲೆಯ ಕಜ್ಜ; ನಾನು ಮೇಟ್ಫಾರ್ಮಿನ್ ತೆಗೆದುಕೊಳ್ಳುತ್ತೇನೆ.", "timestamp": datetime.utcnow()}
        ]
        self.add_consultation(p2, None, conv2, language="kn")

        # Hindi patient
        u3 = str(uuid.uuid4())
        p3 = str(uuid.uuid4())
        self.users[u3] = User(u3, "Sunita Sharma", "sunita@example.com", "+919999888777", "hash", UserRole.patient)
        self.patients[p3] = Patient(p3, u3, "Sunita Sharma", age=37, gender="female", chronic_conditions=["asthma"], doctor_id=None)
        self.vitals[p3] = []
        self.predictions[p3] = []
        self.alerts[p3] = []
        conv3 = [
            {"role": "patient", "content": "नमस्ते डॉक्टर, मैं सुनीता शर्मा हूँ, मेरी उम्र 37 साल। मुझे सांस लेने में दिक्कत होती है और कभी-कभी खांसी रहती है।", "timestamp": datetime.utcnow()},
            {"role": "doctor", "content": "क्या आपको किसी दवा से एलर्जी है? किसी समय शीघ्र स्वर बढ़ना हुआ है?", "timestamp": datetime.utcnow()},
            {"role": "patient", "content": "नहीं, मुझे कोई ज्ञात एलर्जी नहीं है। मैं शायद सैलबुटामोल का उपयोग कर रही थी कुछ समय पहले।", "timestamp": datetime.utcnow()}
        ]
        self.add_consultation(p3, None, conv3, language="hi")

context = BackendContext()