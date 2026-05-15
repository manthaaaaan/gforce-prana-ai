# Prana Health Backend

**🚨 IMPORTANT NOTE: REAL CALLS AND MESSAGES WILL BE SENT TO THE CONFIGURED PHONE NUMBER! 🚨**

AI-Powered Chronic Patient Monitoring & Early Health Risk Prediction System

## Tech Stack
- **Framework**: FastAPI
- **ML**: scikit-learn (RandomForest)
- **Auth**: JWT
- **Storage**: In-memory (context-based)

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt
pip install email-validator pandas scikit-learn

# Run server
python main.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register user |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Current user |
| GET/POST | `/patients` | Patient CRUD |
| POST | `/patients/emergency-contact` | Add emergency contact |
| POST | `/vitals` | Submit vitals |
| GET | `/vitals` | Get vitals history |
| POST | `/vitals/heart-failure` | Heart failure prediction |
| GET | `/vitals/heart-failure` | Heart failure history |
| POST | `/predict/risk` | Get risk prediction |
| GET | `/predict/history` | Prediction history |
| GET | `/alerts` | Get alerts |

## Heart Failure Model

- Dataset: `heart_failure_clinical_records_dataset.csv`
- Split: 80% train / 20% test
- Test Accuracy: ~85%

## Configuration

Copy `.env.example` to `.env` and configure:

```env
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```