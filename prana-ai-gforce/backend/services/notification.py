from typing import List, Dict
import logging

from config import config
from models import AlertType

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self):
        self.twilio_enabled = bool(config.TWILIO_ACCOUNT_SID and config.TWILIO_AUTH_TOKEN)
        self.fcm_enabled = bool(config.FCM_API_KEY)

    def send_sms(self, phone: str, message: str) -> bool:
        if not self.twilio_enabled:
            logger.info(f"[MOCK SMS] To: {phone}, Message: {message}")
            return True
            
        try:
            from twilio.rest import Client
            client = Client(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
            client.messages.create(
                body=message,
                from_=config.TWILIO_PHONE_NUMBER,
                to=phone
            )
            logger.info(f"SMS sent to {phone}")
            return True
        except Exception as e:
            logger.error(f"Failed to send SMS: {e}")
            return False

    def send_push_notification(self, fcm_token: str, title: str, body: str) -> bool:
        if not self.fcm_enabled:
            logger.info(f"[MOCK PUSH] Title: {title}, Body: {body}")
            return True
            
        try:
            import firebase_admin
            from firebase_admin import messaging
            
            if not firebase_admin._apps:
                firebase_admin.initialize_app()
                
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                token=fcm_token
            )
            messaging.send(message)
            logger.info(f"Push notification sent to {fcm_token[:20]}...")
            return True
        except Exception as e:
            logger.error(f"Failed to send push notification: {e}")
            return False

    def send_emergency_alert(self, patient_name: str, phone: str, alert_type: AlertType, details: str) -> Dict:
        message = f"🚨 Emergency Alert: {patient_name} - {alert_type.value}. {details}"
        
        sms_sent = self.send_sms(phone, message)
        
        return {
            "sms_sent": sms_sent,
            "push_sent": True,
            "message": message
        }

notification_service = NotificationService()