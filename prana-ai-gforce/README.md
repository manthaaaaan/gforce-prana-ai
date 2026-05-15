<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Made_by-Team_Gforce-8B5CF6?style=for-the-badge" />
</div>

<br />

<div align="center">
  <h1 align="center">🫀 PRANA</h1>
  <p align="center">
    <strong>An AI-Powered Patient Monitoring & Clinical Intelligence Platform</strong>
    <br />
    <i>Built by Team Gforce</i>
  </p>
</div>

---

## 🌟 Overview

**PRANA** is a next-generation clinical dashboard engineered to monitor, predict, and automate patient care. Combining high-fidelity real-time wearable simulations with bleeding-edge AI integrations, PRANA bridges the gap between chronic patient monitoring and automated clinical intervention.

From real-time heart failure prediction to a context-aware smart medicine scheduler powered by multimodal AI, PRANA represents the future of autonomous healthcare.

---

## ✨ Core Features

### 📡 1. Live Monitoring Command Center
- **Real-Time Vitals Engine:** High-frequency tracking of Heart Rate, Blood Pressure, Ejection Fraction, and Serum Creatinine via simulated Bluetooth smartwatch sync.
- **Automated Emergency Protocol:** When vitals crash into the "Danger Zone", PRANA executes geolocation lookups and routes critical payloads to emergency responders.
- **Multilingual VoIP Alerts:** Dynamically generates Twilio TwiML to broadcast automated emergency voice calls to doctors in **English, Hindi, and Kannada**. **(🚨 NOTE: REAL CALLS AND MESSAGES WILL COME TO YOUR PHONE! 🚨)**

### 🧠 2. AI Predictive Analytics
- **Machine Learning Risk Scoring:** Uses a trained Random Forest model to analyze 12 distinct clinical parameters, instantly calculating a patient's mortality and deterioration risk.
- **7-Day Risk Forecast:** Plots an intelligent predictive trajectory visualizing how a patient's health will evolve over the upcoming week.
- **SHAP Explainability:** Provides transparent insights into *why* the AI generated a specific risk score, highlighting the most dangerous vitals.

### 💊 3. Smart Medicine Scheduler
- **Vision AI Prescription Sync:** Upload a photo of a doctor's prescription, and Google's **Gemini 2.5 Flash Vision** model will automatically extract and structure the medication name, dosage, and frequency.
- **Live Dosage Tracking:** An active timeline that constantly cross-references the current time to calculate your exact next dose down to the minute.
- **Context-Aware Medical Chatbot:** A beautiful floating AI assistant powered by **Groq LLaMA 3.1**. It acts as a pocket pharmacist that understands the exact current time and your active schedule to answer queries like *"What pill do I take next?"* without hallucinating.

---

## 🛠️ Technology Stack

### Frontend Architecture
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![Vite](https://img.shields.io/badge/vite-%23646CFF.svg?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

- **React & Vite:** Lightning-fast frontend tooling and rendering.
- **Tailwind CSS:** Custom premium glassmorphism styling and dynamic UI animations.

### Backend & Integrations
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![Python](https://img.shields.io/badge/python-3670A0?style=for-the-badge&logo=python&logoColor=ffdd54)
![Twilio](https://img.shields.io/badge/Twilio-F22F46?style=for-the-badge&logo=Twilio&logoColor=white)
![Google Cloud](https://img.shields.io/badge/GoogleCloud-%234285F4.svg?style=for-the-badge&logo=google-cloud&logoColor=white)

- **FastAPI:** High-performance async Python backend server.
- **Groq API:** LLaMA 3.1 ultra-low-latency clinical reasoning.
- **Google GenAI:** Gemini 2.5 Flash for multimodal medical image processing.
- **Twilio & Pushbullet:** High-urgency push and VoIP infrastructure. **(🚨 NOTE: REAL CALLS AND MESSAGES WILL COME TO YOUR PHONE! 🚨)**

---

## 🚀 Getting Started

### 1. Configure the Environment
Ensure your `backend/.env` file is populated with your API keys:
```env
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_FROM_NUMBER=your_number
TO_NUMBER=your_number
PUSHBULLET_TOKEN=your_token
```

### 2. Start the Backend
Navigate to the backend directory, install requirements, and boot the server:
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --port 8000 --reload
```

### 3. Start the Frontend
In a separate terminal, start the React interface:
```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:5173` to experience the PRANA platform.

---

<div align="center">
  <i>Developed with ❤️ by Team Gforce for the future of healthcare.</i>
</div>
