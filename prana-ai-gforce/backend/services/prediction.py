import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, classification_report
from typing import List, Dict
import pickle
import os

from models import RiskLevel

FEATURE_COLS = [
    'age', 'anaemia', 'creatinine_phosphokinase', 'diabetes', 
    'ejection_fraction', 'high_blood_pressure', 'platelets', 
    'serum_creatinine', 'serum_sodium', 'sex', 'smoking', 'time'
]
TARGET_COL = 'DEATH_EVENT'

class HeartFailurePredictor:
    def __init__(self, model_path: str = None):
        self.scaler = StandardScaler()
        self.model = None
        self.feature_cols = FEATURE_COLS
        self.is_trained = False
        
        if model_path and os.path.exists(model_path):
            self.load_model(model_path)
        else:
            self.train_model()
    
    def load_data(self) -> tuple:
        csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "heart_failure_clinical_records_dataset.csv")
        df = pd.read_csv(csv_path)
        
        X = df[self.feature_cols].values
        y = df[TARGET_COL].values
        
        return X, y
    
    def train_model(self):
        X, y = self.load_data()
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        self.model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        self.model.fit(X_train_scaled, y_train)
        
        y_pred = self.model.predict(X_test_scaled)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"Model trained with 80/20 split")
        print(f"Training samples: {len(X_train)}")
        print(f"Test samples: {len(X_test)}")
        print(f"Test Accuracy: {accuracy:.4f}")
        
        self.is_trained = True
        
        model_path = os.path.join(os.path.dirname(__file__), "..", "..", "heart_failure_model.pkl")
        self.save_model(model_path)
    
    def save_model(self, path: str):
        with open(path, 'wb') as f:
            pickle.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_cols': self.feature_cols
            }, f)
        print(f"Model saved to {path}")
    
    def load_model(self, path: str):
        try:
            with open(path, 'rb') as f:
                data = pickle.load(f)
                self.model = data['model']
                self.scaler = data['scaler']
                self.feature_cols = data['feature_cols']
                self.is_trained = True
            print(f"Model loaded from {path}")
        except Exception as e:
            print(f"Failed to load model: {e}. Retraining...")
            self.train_model()
    
    def predict(self, input_data: Dict) -> Dict:
        if not self.is_trained or self.model is None:
            self.train_model()
        
        features = np.array([[
            input_data.get('age', 0),
            input_data.get('anaemia', 0),
            input_data.get('creatinine_phosphokinase', 0),
            input_data.get('diabetes', 0),
            input_data.get('ejection_fraction', 0),
            input_data.get('high_blood_pressure', 0),
            input_data.get('platelets', 0),
            input_data.get('serum_creatinine', 0),
            input_data.get('serum_sodium', 0),
            input_data.get('sex', 0),
            input_data.get('smoking', 0),
            input_data.get('time', 0)
        ]])
        
        features_scaled = self.scaler.transform(features)
        
        risk_level_num = self.model.predict(features_scaled)[0]
        probabilities = self.model.predict_proba(features_scaled)[0]
        
        risk_score = float(probabilities[1])
        
        if risk_level_num == 0:
            risk_level = RiskLevel.low
        elif risk_level_num == 1:
            risk_level = RiskLevel.medium
        else:
            risk_level = RiskLevel.high
        
        explanation = self._generate_explanation(input_data, risk_score)
        
        return {
            "risk_score": round(risk_score, 3),
            "risk_level": risk_level,
            "explanation": explanation
        }
    
    def _generate_explanation(self, data: Dict, risk_score: float) -> List[str]:
        reasons = []
        
        age = data.get('age', 0)
        if age > 70:
            reasons.append(f"Advanced age: {age} years")
        
        if data.get('ejection_fraction', 0) < 30:
            reasons.append(f"Low ejection fraction: {data.get('ejection_fraction')}%")
        elif data.get('ejection_fraction', 0) < 40:
            reasons.append(f"Moderately reduced ejection fraction")
        
        if data.get('serum_creatinine', 0) > 1.5:
            reasons.append(f"High serum creatinine: {data.get('serum_creatinine')} mg/dL")
        
        if data.get('serum_sodium', 0) < 130:
            reasons.append(f"Low serum sodium: {data.get('serum_sodium')} mEq/L")
        
        if data.get('creatinine_phosphokinase', 0) > 500:
            reasons.append(f"Elevated CPK enzyme")
        
        if data.get('anaemia', 0) == 1:
            reasons.append("Patient has anaemia")
        
        if data.get('diabetes', 0) == 1:
            reasons.append("Patient has diabetes")
        
        if data.get('high_blood_pressure', 0) == 1:
            reasons.append("Patient has high blood pressure")
        
        if data.get('smoking', 0) == 1:
            reasons.append("Patient is a smoker")
        
        if risk_score > 0.7:
            reasons.append("High probability of heart failure event")
        elif risk_score > 0.4:
            reasons.append("Moderate risk of heart failure event")
        
        if not reasons:
            reasons.append("All parameters within normal range")
        
        return reasons


model_path = os.path.join(os.path.dirname(__file__), "..", "..", "heart_failure_model.pkl")
predictor = HeartFailurePredictor(model_path if os.path.exists(model_path) else None)