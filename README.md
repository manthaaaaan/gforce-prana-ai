<div align="center">
  <img src="https://api.iconify.design/lucide:heart-pulse.svg?color=%23ef4444" alt="Prana AI Logo" width="100" height="100">
  
  <h1>Prana AI G-Force</h1>
  <h3>Autonomous Multi-Agent Clinical Intelligence</h3>
  
  <p>
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python">
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
    <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI">
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind">
    <img src="https://img.shields.io/badge/scikit--learn-%23F7931E.svg?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn">
  </p>

  <br />
  <p>
    <em>Bridging the gap between continuous wearable data and clinical triage through autonomous AI orchestration, live internet research, and real-world side effects.</em>
  </p>

  <h3>Built by Team G-Force at Scaler Institute of Technology 🚀</h3>
</div>

---

## 🌟 Overview

Doctors cannot monitor high-risk heart failure patients 24/7. When vitals deteriorate, response time is critical. 

**Prana AI** acts as an autonomous digital resident. When it receives a vitals webhook (e.g., from an Apple Watch), it autonomously fans out tasks to a network of specialized AI agents. It uses local Machine Learning to predict risk, live web search for clinical guidelines, and deep reasoning to execute real-world side effects like calling the doctor or sending emergency SMS alerts.

## 🛠️ Tech Stack & Integrations

### Frontend
- ⚡ **Vite + React.js**: Lightning-fast, dynamic user interface.
- 🎨 **Tailwind CSS**: Beautiful, responsive, and modern clinical styling.
- 📊 **Recharts**: Exponential deterioration plotting and visualizers.
- 🎤 **Web Speech API**: Live audio transcription for clinical consultations.

### Backend & AI
- 🐍 **FastAPI**: Asynchronous Python backend orchestrating the agent DAG.
- 🤖 **Groq (LLaMA-3)**: Lightning-fast LLM reasoning for Planner and Context agents.
- 👁️ **Google Gemini Pro Vision**: OCR extraction for physical prescription pads.
- 📈 **Scikit-Learn**: Local Random Forest model (`heart_failure_model.pkl`) for deterministic risk scoring, ensuring zero hallucination.

### Tools & Side-Effects
- 📞 **Twilio API**: Executes physical phone calls localized in English, Hindi, and Kannada.
- 💬 **Pushbullet API**: Dispatches emergency SMS alerts with high-accuracy GPS links.
- 🦆 **DuckDuckGo API**: Performs live clinical web research.
- 🔍 **Omium SDK**: Cryptographic `@omium.trace()` instrumentation across all agents for clinical explainability.

---

## 🚀 Features

### 1. The Autonomous Pipeline
A completely human-free triage system. When a webhook is fired:
1. **Planner Agent** parses the data.
2. **Risk Agent** generates a deterministic ML risk score.
3. **Research Agent** scrapes live clinical guidelines.
4. **Care Plan Agent** synthesizes the data and triggers real-world side-effects (Twilio / Pushbullet).
5. **Reflection Agent** audits the safety and generates a cryptographic trace hash.

### 2. Live Clinical Consultations
A speech-to-text consultation pad that actively listens to the doctor and patient. 
- Automatically extracts structured JSON prescriptions.
- Cross-references requested drugs against the patient's EHR to autonomously detect **Drug-Drug Interactions (DDI)** (e.g., Propranolol vs Glimepiride).

### 3. Smart Medicine Scheduler
- Upload an image of a physical prescription, and Gemini Vision will extract and schedule it.
- Chat naturally with the Groq-powered AI ("What do I take next?") to get temporally-aware dosage instructions.

### 4. Random Forest Risk Simulator
- A visual "what-if" testing sandbox. 
- Modify 12 clinical parameters (e.g., Ejection Fraction, Serum Creatinine) and watch the local scikit-learn model generate an exponential 7-day mortality deterioration curve.

---

## 📦 Deployment Instructions

The application is configured to run serverless on edge networks.

### Backend (Render)
1. Create a Web Service on [Render](https://render.com/).
2. Root Directory: `prana-ai-gforce/backend`
3. Build Command: `pip install -r requirements.txt`
4. Start Command: `uvicorn main:app --host 0.0.0.0 --port 10000`
5. Inject `.env` variables (Groq, Twilio, Pushbullet, Omium).

### Frontend (Vercel)
1. Create a Vite project on [Vercel](https://vercel.com/).
2. Root Directory: `prana-ai-gforce/frontend`
3. Environment Variable: `VITE_API_URL` = `<your-render-url>`

---

## 🔍 Omium Verified Tracing
In healthcare, the "black box" of AI is unacceptable. Prana AI is deeply instrumented with the **Omium SDK**. Every single action, webhook fire, and parallel agent execution is traced and causally linked. This allows human doctors to log into the Omium dashboard post-incident and perfectly audit the AI's step-by-step reasoning.

---
<div align="center">
  <p>Engineered for the future of healthcare. ❤️</p>
</div>
