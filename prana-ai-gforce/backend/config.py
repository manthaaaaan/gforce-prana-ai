import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
    MONGO_DB_NAME = os.getenv("MONGO_DB_NAME", "prana_health")
    
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER", "")
    
    FCM_API_KEY = os.getenv("FCM_API_KEY", "")
    FCM_PROJECT_ID = os.getenv("FCM_PROJECT_ID", "")
    
    DEBUG = os.getenv("DEBUG", "true").lower() == "true"

config = Config()