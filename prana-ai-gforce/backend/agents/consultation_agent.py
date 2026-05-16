import json
import logging
from typing import Any, Dict, List
from groq import Groq
import omium
from config import config

logger = logging.getLogger(__name__)

# Initialize Groq
groq_client = Groq(api_key=config.GROQ_API_KEY) if config.GROQ_API_KEY else None

class ConsultationAgent:
    """Agent to analyze doctor-patient conversations, check conflicts, and generate prescriptions."""

    @omium.trace("analyze_consultation")
    async def analyze(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        transcript = payload.get("transcript", "")
        patient_context = payload.get("patient_context", {})

        if not groq_client:
            return {"error": "Groq client not configured"}

        prompt = f"""
        You are a Clinical Consultation Assistant. 
        Analyze the following transcript of a conversation between a doctor and a patient.
        Patient Context: {json.dumps(patient_context)}
        
        Transcript:
        {transcript}
        
        Tasks:
        1. Summarize the clinical conversation.
        2. Extract any medicines discussed or suggested by the doctor.
        3. Check for potential drug-drug conflicts between the new medicines and the patient's existing medications: {json.dumps(patient_context.get('medications', []))}
        4. Generate a structured prescription (JSON format). IMPORTANT: Pay close attention to when the medicine should be taken. You MUST explicitly provide the exact times of day ("morning", "afternoon", "evening", "night") for EVERY single medicine in the `timeOfDay` list.
        CRITICAL RULE: NEVER use vague terms like "as prescribed earlier" or "continue as before" or "as previously given" for dosage or duration. 
        You MUST provide a specific numerical dosage (e.g., "500mg") and a specific numerical duration (e.g., "30 days"). 
        If the duration is not explicitly mentioned, you MUST default to "30 days". 
        If the dosage is missing, you MUST default to "Standard dose". 
        Your output MUST NOT contain the string "as prescribed earlier".
        
        Return a JSON object with:
        - "summary": string
        - "extracted_meds": list of strings
        - "conflicts": list of objects with {{"pair": "med1 vs med2", "severity": "high/medium/low", "message": "reason"}}
        - "prescription": list of objects with {{"medicineName": string, "dosage": string, "frequency": string, "duration": string, "timeOfDay": list of strings MUST contain ["morning", "afternoon", "evening", or "night"], "timing": string (e.g., 'after food', 'before food'), "instructions": string}}
        - "reasoning": explain your findings
        """

        try:
            chat = groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            result = json.loads(chat.choices[0].message.content)
            return result
        except Exception as e:
            logger.error(f"Consultation analysis failed: {e}")
            return {"error": str(e)}

consultation_agent = ConsultationAgent()

async def consultation_handler(payload: Dict[str, Any]) -> Dict[str, Any]:
    return await consultation_agent.analyze(payload)
