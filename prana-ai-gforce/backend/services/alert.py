from datetime import datetime
from typing import List, Dict, Optional
import logging

from context import context, AlertType, RiskLevel
from services.notification import notification_service

logger = logging.getLogger(__name__)

class AlertService:
    def should_trigger_alert(self, risk_score: float, risk_level: RiskLevel, explanation: List[str]) -> tuple[bool, str]:
        if risk_score > 0.7:
            alert_type = AlertType.emergency
            return True, f"High risk detected: {', '.join(explanation[:3])}"
        elif risk_score > 0.4:
            alert_type = AlertType.warning
            return True, f"Moderate risk: {', '.join(explanation[:2])}"
        return False, ""

    def process_alert(self, patient_id: str, risk_score: float, risk_level: RiskLevel, explanation: List[str]) -> Optional[Dict]:
        should_alert, message = self.should_trigger_alert(risk_score, risk_level, explanation)
        
        if not should_alert:
            return None
        
        alert_type = AlertType.emergency if risk_score > 0.7 else AlertType.warning
        
        patient = context.get_patient_by_id(patient_id)
        sent_to = []
        
        if patient:
            if patient.doctor_id:
                sent_to.append(f"doctor:{patient.doctor_id}")
            for ec in patient.emergency_contacts:
                sent_to.append(ec.get("phone", ""))
        
        alert = context.add_alert(patient_id, alert_type, message, sent_to)
        
        self.send_notifications(patient_id, alert_type, message)
        
        return {
            "id": alert.id,
            "patient_id": patient_id,
            "type": alert.alert_type.value,
            "message": message,
            "sent_to": sent_to
        }

    def send_notifications(self, patient_id: str, alert_type: AlertType, message: str) -> bool:
        patient = context.get_patient_by_id(patient_id)
        
        if not patient:
            logger.error(f"Patient not found: {patient_id}")
            return False

        recipients = []
        
        if patient.doctor_id:
            doctor = context.get_user_by_id(patient.doctor_id)
            if doctor:
                recipients.append({"name": doctor.name, "phone": doctor.phone, "type": "doctor"})
        
        for ec in patient.emergency_contacts:
            recipients.append({"name": ec.get("name", ""), "phone": ec.get("phone", ""), "type": "emergency_contact"})
        
        sent_count = 0
        for recipient in recipients:
            result = notification_service.send_emergency_alert(
                patient_name=patient.name or "Patient",
                phone=recipient["phone"],
                alert_type=alert_type,
                details=message
            )
            if result["sms_sent"]:
                sent_count += 1
        
        return sent_count > 0

alert_service = AlertService()