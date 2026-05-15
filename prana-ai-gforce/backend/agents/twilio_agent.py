"""Twilio Alert Agent — Autonomous emergency voice calls and Pushbullet notifications."""

import asyncio
import logging
import os
from typing import Any, Dict

import requests
from twilio.rest import Client

from config import config

logger = logging.getLogger(__name__)

# --- Multilingual TwiML Templates ---
TRANSLATIONS = {
    "en": {
        "lang_code": "en-IN",
        "voice": "alice",
        "msg_1": "Critical Alert. Critical Alert.",
        "msg_2": "Prana AI has detected a medical emergency. Patient {patient_name} is in the danger zone. Criticality level is {risk_score} out of 100.",
        "msg_3": "Critical vitals detected. Ejection fraction is critically low. Serum creatinine is dangerously elevated. Heart rate is dangerously high. Immediate intervention is required.",
        "msg_4": "Repeating. Patient {patient_name}. Criticality level {risk_score} out of 100. Please respond immediately. This is Prana AI Patient Monitoring System.",
    },
    "hi": {
        "lang_code": "hi-IN",
        "voice": "Polly.Aditi",
        "msg_1": "महत्वपूर्ण चेतावनी। महत्वपूर्ण चेतावनी।",
        "msg_2": "प्राणा एआई ने मेडिकल इमरजेंसी का पता लगाया है। मरीज़ {patient_name} खतरे में है। गंभीरता का स्तर 100 में से {risk_score} है।",
        "msg_3": "महत्वपूर्ण संकेत खतरनाक हैं। इजेक्शन अंश बहुत कम है। सीरम क्रिएटिनिन खतरनाक रूप से बढ़ा हुआ है। हृदय गति बहुत तेज है। तुरंत ध्यान देने की आवश्यकता है।",
        "msg_4": "दोहरा रहे हैं। मरीज़ {patient_name}। गंभीरता का स्तर 100 में से {risk_score} है। कृपया तुरंत कार्रवाई करें। यह प्राणा एआई पेशेंट मॉनिटरिंग सिस्टम है।",
    },
    "kn": {
        "lang_code": "kn-IN",
        "voice": "Google.kn-IN-Standard-A",
        "msg_1": "ತುರ್ತು ಎಚ್ಚರಿಕೆ. ತುರ್ತು ಎಚ್ಚರಿಕೆ.",
        "msg_2": "ಪ್ರಾಣಾ ಎಐ ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ಪತ್ತೆಹಚ್ಚಿದೆ. ರೋಗಿ {patient_name} ಅಪಾಯದಲ್ಲಿದ್ದಾರೆ. ಅಪಾಯದ ಮಟ್ಟ 100 ಕ್ಕೆ {risk_score} ಆಗಿದೆ.",
        "msg_3": "ನಿರ್ಣಾಯಕ ಚಿಹ್ನೆಗಳು ಅಪಾಯಕಾರಿ. ಎಜೆಕ್ಷನ್ ಫ್ರ್ಯಾಕ್ಷನ್ ತೀರಾ ಕಡಿಮೆಯಾಗಿದೆ. ಸೀರಮ್ ಕ್ರಿಯೇಟಿನೈನ್ ಅಪಾಯಕಾರಿಯಾಗಿ ಹೆಚ್ಚಾಗಿದೆ. ಹೃದಯ ಬಡಿತ ತುಂಬಾ ವೇಗವಾಗಿದೆ. ತಕ್ಷಣದ ಗಮನ ಅಗತ್ಯವಿದೆ.",
        "msg_4": "ಪುನರಾವರ್ತಿಸುತ್ತಿದ್ದೇವೆ. ರೋಗಿ {patient_name}. ಅಪಾಯದ ಮಟ್ಟ 100 ಕ್ಕೆ {risk_score} ಆಗಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಪ್ರತಿಕ್ರಿಯಿಸಿ. ಇದು ಪ್ರಾಣಾ ಎಐ ರೋಗಿಗಳ ಮೇಲ್ವಿಚಾರಣಾ ವ್ಯವಸ್ಥೆ.",
    },
}


class TwilioAlertAgent:
    """Agent that autonomously dispatches Twilio voice calls and Pushbullet
    notifications when a patient enters a critical state."""

    def __init__(self):
        self.twilio_client = None
        self.from_number = config.TWILIO_PHONE_NUMBER
        self.to_number = os.getenv("TO_NUMBER", "")
        self.pushbullet_token = config.PUSHBULLET_TOKEN

        if config.TWILIO_ACCOUNT_SID and config.TWILIO_AUTH_TOKEN:
            try:
                self.twilio_client = Client(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
                logger.info("TwilioAlertAgent: Twilio client initialized")
            except Exception as e:
                logger.error(f"TwilioAlertAgent: Failed to init Twilio client: {e}")

    # --- Public handler (registered in agent_manager) ---
    async def handle(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        """Entry point invoked by the agent worker.

        Expected payload keys:
            patient_name  (str)  – name of the patient
            risk_score    (int)  – criticality 0-100
            language      (str)  – 'en' | 'hi' | 'kn'
            to_number     (str)  – override recipient (optional)
            message       (str)  – body for Pushbullet (optional)
            actions       (list) – subset of ['call', 'push'] (optional, defaults to both)
        """
        patient_name = payload.get("patient_name", "Unknown Patient")
        risk_score = payload.get("risk_score", "unknown")
        language = payload.get("language", "en")
        to_number = payload.get("to_number") or self.to_number
        actions = payload.get("actions", ["call", "push"])

        results: Dict[str, Any] = {"patient_name": patient_name, "risk_score": risk_score}

        # 1. Twilio Voice Call
        if "call" in actions:
            call_result = await asyncio.to_thread(
                self._make_call, patient_name, risk_score, language, to_number
            )
            results["call"] = call_result

        # 2. Pushbullet Notification
        if "push" in actions:
            message = payload.get("message") or self._build_push_message(patient_name, risk_score)
            push_result = await asyncio.to_thread(self._send_pushbullet, message)
            results["push"] = push_result

        results["status"] = "dispatched"
        logger.info(f"TwilioAlertAgent dispatched alerts for {patient_name} (risk={risk_score})")
        return results

    # --- Twilio Voice Call ---
    def _make_call(self, patient_name: str, risk_score: Any, language: str, to_number: str) -> Dict[str, Any]:
        if not self.twilio_client:
            return {"status": "skipped", "reason": "Twilio client not configured"}

        if not to_number:
            return {"status": "skipped", "reason": "No TO_NUMBER configured"}

        if language not in TRANSLATIONS:
            language = "en"

        t = TRANSLATIONS[language]
        lang_attr = f'language="{t["lang_code"]}"'
        voice_attr = f'voice="{t["voice"]}"' if language != "kn" else ""

        twiml_msg = f"""<Response>
    <Pause length="3"/>
    <Say {voice_attr} {lang_attr}>
        {t["msg_1"]}
    </Say>
    <Pause length="1"/>
    <Say {voice_attr} {lang_attr}>
        {t["msg_2"].format(patient_name=patient_name, risk_score=risk_score)}
    </Say>
    <Pause length="1"/>
    <Say {voice_attr} {lang_attr}>
        {t["msg_3"]}
    </Say>
    <Pause length="1"/>
    <Say {voice_attr} {lang_attr}>
        {t["msg_4"].format(patient_name=patient_name, risk_score=risk_score)}
    </Say>
</Response>"""

        try:
            call = self.twilio_client.calls.create(
                twiml=twiml_msg,
                to=to_number,
                from_=self.from_number,
            )
            logger.info(f"Twilio call initiated: SID={call.sid} to={to_number}")
            return {"status": "call_initiated", "call_sid": call.sid, "to": to_number}
        except Exception as e:
            logger.error(f"Twilio call failed: {e}")
            return {"status": "failed", "error": str(e)}

    # --- Pushbullet Notification ---
    def _send_pushbullet(self, message: str) -> Dict[str, Any]:
        if not self.pushbullet_token or self.pushbullet_token.startswith("your_"):
            return {"status": "skipped", "reason": "Pushbullet token not configured"}

        headers = {
            "Access-Token": self.pushbullet_token,
            "Content-Type": "application/json",
        }
        payload = {
            "type": "note",
            "title": "🚨 Prana — CRITICAL PATIENT ALERT",
            "body": message,
        }

        try:
            response = requests.post(
                "https://api.pushbullet.com/v2/pushes",
                headers=headers,
                json=payload,
                timeout=10,
            )
            return {"status": "push_sent", "details": response.json()}
        except Exception as e:
            logger.error(f"Pushbullet push failed: {e}")
            return {"status": "failed", "error": str(e)}

    # --- Helpers ---
    def _build_push_message(self, patient_name: str, risk_score: Any) -> str:
        return (
            f"Patient: {patient_name}\n"
            f"Risk Score: {risk_score}/100\n"
            f"Status: 🔴 DANGER ZONE\n\n"
            f"⚠️ Immediate intervention required!\n"
            f"This is an automated alert from Prana AI."
        )


# Singleton
twilio_alert_agent = TwilioAlertAgent()


async def twilio_alert_handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Handler function registered with the AgentManager."""
    return await twilio_alert_agent.handle(payload)
