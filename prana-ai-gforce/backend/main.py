from fastapi import FastAPI, Request, UploadFile, File
from twilio.rest import Client
import requests
from fastapi.middleware.cors import CORSMiddleware
import os
import io
import json
from dotenv import load_dotenv
from pydantic import BaseModel
import joblib
import numpy as np
import google.generativeai as genai
import PIL.Image
from groq import Groq

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
groq_client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

app = FastAPI(title="Prana Backend")

# Load ML Model
try:
    model_path = os.path.join(os.path.dirname(__file__), "..", "heart_failure_model.pkl")
    model_data = joblib.load(model_path)
    model = model_data['model'] if isinstance(model_data, dict) else model_data
except Exception as e:
    print(f"Error loading model: {e}")
    model = None

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to Prana Backend API"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

# --- Prescription Analysis ---
@app.post("/analyze-prescription")
async def analyze_prescription(file: UploadFile = File(...)):
    if not GEMINI_API_KEY:
        return {"error": "GEMINI_API_KEY not configured"}
        
    try:
        contents = await file.read()
        image = PIL.Image.open(io.BytesIO(contents))
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = """
        You are an expert pharmacist and doctor AI. 
        Analyze the provided prescription image. Extract all the medications listed.
        Return the response strictly as a JSON array of objects with the following keys:
        - "medicineName" (string)
        - "dosage" (string, e.g., "500mg")
        - "frequency" (string, e.g., "1-0-1", "Twice a day", "Once a day")
        - "duration" (string, e.g., "7 days", "10 days", "Unknown")
        - "timeOfDay" (array of strings). Please map the frequency accurately to times of day. For example: "1-0-1" maps to ["Morning", "Night"], "1-1-1" maps to ["Morning", "Afternoon", "Night"], "1-0-0" maps to ["Morning"], and "0-1-0" maps to ["Afternoon"].
        
        Do not wrap the JSON in Markdown formatting like ```json ... ```. Just return the raw JSON array.
        If you cannot read the image or find no medicines, return an empty array [].
        """
        
        response = model.generate_content([prompt, image])
        
        # Clean the response just in case it contains markdown
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:]
        if text.startswith('```'):
            text = text[3:]
        if text.endswith('```'):
            text = text[:-3]
            
        data = json.loads(text.strip())
        return data
    except Exception as e:
        print(f"Error analyzing prescription: {e}")
        return {"error": str(e)}

# --- Chatbot Endpoint ---
class ChatRequest(BaseModel):
    message: str
    context: str
    history: list = []

@app.post("/chat-prescription")
async def chat_prescription(data: ChatRequest):
    if not groq_client:
        return {"error": "GROQ_API_KEY not configured on the server."}
        
    print(f"--- INCOMING CHAT CONTEXT ---\n{data.context}\n---------------------------")
        
    try:
        system_prompt = f"""
        You are an AI medical and dietary assistant integrated into the Prana Smart Medicine Scheduler.
        Your goal is to answer patient questions about their prescriptions, timing, and diet safely and accurately.
        
        IMPORTANT: Your primary directive is to provide helpful context about the medicines provided in the context below. 
        You are an AI assistant, not a doctor. If you provide any medical advice, include a brief disclaimer.
        
        CRITICAL: The medication schedule below is the absolute ground truth. If the user recently added or removed a medicine, it will be reflected below. ALWAYS rely on this context over older messages in the conversation history.
        
        VERY IMPORTANT: You will be provided with the CURRENT TIME in the context below. If the user asks "What medicine should I take next?", you MUST look at the CURRENT TIME and compare it against the times of all active medicines in the schedule. The medicine with the closest time AFTER the CURRENT TIME is the next medicine they should take.
        
        Here is the context (Current Time and Schedule):
        {data.context}
        
        Keep your answers concise, empathetic, and actionable.
        """
        
        messages = [{"role": "system", "content": system_prompt}]
        for msg in data.history:
            messages.append({"role": msg.get("role", "user"), "content": msg.get("content", "")})
        
        messages.append({"role": "user", "content": data.message})
        
        completion = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=messages,
            temperature=0.5,
            max_tokens=512,
        )
        
        return {"response": completion.choices[0].message.content}
    except Exception as e:
        print(f"Error in chat_prescription: {e}")
        return {"error": str(e)}

# --- Alert Endpoints ---
TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER", "")
TO_NUMBER = os.getenv("TO_NUMBER", "")
PUSHBULLET_TOKEN = os.getenv("PUSHBULLET_TOKEN", "")

TRANSLATIONS = {
    "en": {
        "lang_code": "en-IN",
        "voice": "alice",
        "msg_1": "Critical Alert. Critical Alert.",
        "msg_2": "Prana AI has detected a medical emergency. Patient {patient_name} is in the danger zone. Criticality level is {risk_score} out of 100.",
        "msg_3": "Critical vitals detected. Ejection fraction is critically low. Serum creatinine is dangerously elevated. Heart rate is dangerously high. Immediate intervention is required.",
        "msg_4": "Repeating. Patient {patient_name}. Criticality level {risk_score} out of 100. Please respond immediately. This is Prana AI Patient Monitoring System."
    },
    "hi": {
        "lang_code": "hi-IN",
        "voice": "Polly.Aditi",
        "msg_1": "महत्वपूर्ण चेतावनी। महत्वपूर्ण चेतावनी।",
        "msg_2": "प्राणा एआई ने मेडिकल इमरजेंसी का पता लगाया है। मरीज़ {patient_name} खतरे में है। गंभीरता का स्तर 100 में से {risk_score} है।",
        "msg_3": "महत्वपूर्ण संकेत खतरनाक हैं। इजेक्शन अंश बहुत कम है। सीरम क्रिएटिनिन खतरनाक रूप से बढ़ा हुआ है। हृदय गति बहुत तेज है। तुरंत ध्यान देने की आवश्यकता है।",
        "msg_4": "दोहरा रहे हैं। मरीज़ {patient_name}। गंभीरता का स्तर 100 में से {risk_score} है। कृपया तुरंत कार्रवाई करें। यह प्राणा एआई पेशेंट मॉनिटरिंग सिस्टम है।"
    },
    "kn": {
        "lang_code": "kn-IN",
        "voice": "Google.kn-IN-Standard-A",
        "msg_1": "ತುರ್ತು ಎಚ್ಚರಿಕೆ. ತುರ್ತು ಎಚ್ಚರಿಕೆ.",
        "msg_2": "ಪ್ರಾಣಾ ಎಐ ವೈದ್ಯಕೀಯ ತುರ್ತುಸ್ಥಿತಿಯನ್ನು ಪತ್ತೆಹಚ್ಚಿದೆ. ರೋಗಿ {patient_name} ಅಪಾಯದಲ್ಲಿದ್ದಾರೆ. ಅಪಾಯದ ಮಟ್ಟ 100 ಕ್ಕೆ {risk_score} ಆಗಿದೆ.",
        "msg_3": "ನಿರ್ಣಾಯಕ ಚಿಹ್ನೆಗಳು ಅಪಾಯಕಾರಿ. ಎಜೆಕ್ಷನ್ ಫ್ರ್ಯಾಕ್ಷನ್ ತೀರಾ ಕಡಿಮೆಯಾಗಿದೆ. ಸೀರಮ್ ಕ್ರಿಯೇಟಿನೈನ್ ಅಪಾಯಕಾರಿಯಾಗಿ ಹೆಚ್ಚಾಗಿದೆ. ಹೃದಯ ಬಡಿತ ತುಂಬಾ ವೇಗವಾಗಿದೆ. ತಕ್ಷಣದ ಗಮನ ಅಗತ್ಯವಿದೆ.",
        "msg_4": "ಪುನರಾವರ್ತಿಸುತ್ತಿದ್ದೇವೆ. ರೋಗಿ {patient_name}. ಅಪಾಯದ ಮಟ್ಟ 100 ಕ್ಕೆ {risk_score} ಆಗಿದೆ. ದಯವಿಟ್ಟು ತಕ್ಷಣ ಪ್ರತಿಕ್ರಿಯಿಸಿ. ಇದು ಪ್ರಾಣಾ ಎಐ ರೋಗಿಗಳ ಮೇಲ್ವಿಚಾರಣಾ ವ್ಯವಸ್ಥೆ."
    }
}

@app.post("/call-alert")
async def call_alert(request: Request):
    data = await request.json()
    risk_score = data.get("risk_score", "unknown")
    patient_name = data.get("patient_name", "Unknown Patient")
    lang = data.get("language", "en")
    
    if lang not in TRANSLATIONS:
        lang = "en"
        
    t = TRANSLATIONS[lang]
    lang_attr = f'language="{t["lang_code"]}"'
    # Use standard voice attribute if english or hindi (Aditi), else omit for Google Standard auto-fallback
    voice_attr = f'voice="{t["voice"]}"' if lang != "kn" else ""
    
    twiml_msg = f'''<Response>
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
</Response>'''

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    call = client.calls.create(
        twiml=twiml_msg,
        to=TO_NUMBER,
        from_=TWILIO_FROM_NUMBER
    )
    
    return {"status": "call_initiated", "call_sid": call.sid}

@app.post("/pushbullet-alert")
async def pushbullet_alert(request: Request):
    data = await request.json()
    message = data.get("message", "Critical patient alert")
    
    headers = {
        "Access-Token": PUSHBULLET_TOKEN,
        "Content-Type": "application/json"
    }
    payload = {
        "type": "note",
        "title": "🚨 Prana — CRITICAL PATIENT ALERT",
        "body": message
    }
    
    response = requests.post("https://api.pushbullet.com/v2/pushes", headers=headers, json=payload)
    return {"status": "push_sent", "details": response.json()}

@app.post("/medicine-call")
async def medicine_call(request: Request):
    data = await request.json()
    medicine_name = data.get("medicine_name", "your medicine")
    dosage = data.get("dosage", "prescribed dosage")
    instructions = data.get("instructions", "")
    
    instruction_twiml = f"Special note: {instructions}." if instructions else ""
    
    twiml_msg = f'''<Response>
    <Pause length="3"/>
    <Say voice="alice" language="en-IN">
        Hello! This is Prana, your AI health assistant.
        This is a reminder to take your medicine.
        Medicine name: {medicine_name}.
        Dosage: {dosage}.
        {instruction_twiml}
        Please take your medicine now and stay healthy.
        Have a great day. Goodbye.
    </Say>
</Response>'''

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    call = client.calls.create(
        twiml=twiml_msg,
        to=TO_NUMBER,
        from_=TWILIO_FROM_NUMBER
    )
    
    return {"status": "reminder_call_sent", "call_sid": call.sid}

# --- ML Prediction Endpoint ---
class HeartFailureInput(BaseModel):
    age: float
    anaemia: int
    creatinine_phosphokinase: float
    diabetes: int
    ejection_fraction: float
    high_blood_pressure: int
    platelets: float
    serum_creatinine: float
    serum_sodium: float
    sex: int
    smoking: int
    time: float

@app.post("/predict")
async def predict_heart_failure(data: HeartFailureInput):
    if model is None:
        return {"error": "Model not loaded properly on the server."}
        
    # Prepare features in exact order
    features = np.array([
        data.age,
        data.anaemia,
        data.creatinine_phosphokinase,
        data.diabetes,
        data.ejection_fraction,
        data.high_blood_pressure,
        data.platelets,
        data.serum_creatinine,
        data.serum_sodium,
        data.sex,
        data.smoking,
        data.time
    ])
    
    # Scale features using provided StandardScaler parameters
    means = np.array([6.10725272e+01, 4.47698745e-01, 6.02790795e+02, 4.47698745e-01,
                      3.78870293e+01, 3.72384937e-01, 2.63670546e+05, 1.39171548e+00,
                      1.36527197e+02, 6.40167364e-01, 3.17991632e-01, 1.27217573e+02])
    stds = np.array([1.14198983e+01, 4.97257055e-01, 1.01024275e+03, 4.97257055e-01,
                     1.19696181e+01, 4.83440168e-01, 9.92021416e+04, 1.08677904e+00,
                     4.41638885e+00, 4.79951154e-01, 4.65696203e-01, 7.74132714e+01])
    
    scaled_features = (features - means) / stds
    scaled_features = scaled_features.reshape(1, -1)
    
    # Predict probabilities
    probability = float(model.predict_proba(scaled_features)[0][1])
    
    # Calculate risk score (0-100)
    risk_score = round(probability * 100, 2)
    
    status = "SURVIVE" if probability < 0.5 else "DETERIORATE"
    
    return {
        "probability": probability,
        "risk_score": risk_score,
        "prediction": status
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
