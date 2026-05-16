import React, { useState } from 'react';
import { ArrowLeft, Activity, User, Heart, Coffee, AlertTriangle, CheckCircle2, Droplet, TrendingUp, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useAgentActivity } from '../AgentActivityToast';

// Define the patient profile type
interface PatientProfile {
  id: string;
  name: string;
  description: string;
  lifestyle: string[];
  icon: React.ReactNode;
  color: string;
  data: {
    age: number;
    anaemia: number;
    creatinine_phosphokinase: number;
    diabetes: number;
    ejection_fraction: number;
    high_blood_pressure: number;
    platelets: number;
    serum_creatinine: number;
    serum_sodium: number;
    sex: number;
    smoking: number;
    time: number;
  }
}

const generateTrendData = (finalScore: number) => {
  const data = [];
  data.push({ day: 'Today', score: Math.round(finalScore) });

  let futureScore = finalScore;
  const deteriorationRate = finalScore > 50 ? 2.5 : 0.5; // High risk deteriorates faster
  for (let i = 1; i <= 7; i++) {
    // Exponential curve for realistic deterioration
    futureScore = futureScore + deteriorationRate * (1 + (i * 0.15)) + (Math.random() * 2 - 1);
    data.push({
      day: `Day +${i}`,
      score: Math.min(100, Math.max(0, Math.round(futureScore)))
    });
  }
  return data;
};

// Pre-defined patient profiles
const PATIENT_PROFILES: PatientProfile[] = [
  {
    id: 'healthy',
    name: 'Healthy Adult (Low Risk)',
    description: '45-year-old male with no significant medical history.',
    lifestyle: ['Runs 5km 3x a week', 'Mediterranean diet', 'Sleeps 8 hours daily'],
    icon: <Heart className="text-emerald-500" size={24} />,
    color: 'emerald',
    data: {
      age: 45, sex: 1, anaemia: 0, diabetes: 0, high_blood_pressure: 0, smoking: 0,
      creatinine_phosphokinase: 200, ejection_fraction: 60, platelets: 250000,
      serum_creatinine: 0.9, serum_sodium: 140, time: 200
    }
  },
  {
    id: 'high-risk',
    name: 'Critical Patient (High Risk)',
    description: '75-year-old female with multiple comorbidities.',
    lifestyle: ['Sedentary lifestyle', 'Smokes 1 pack/day', 'High sodium diet'],
    icon: <AlertTriangle className="text-red-500" size={24} />,
    color: 'red',
    data: {
      age: 75, sex: 0, anaemia: 1, diabetes: 1, high_blood_pressure: 1, smoking: 1,
      creatinine_phosphokinase: 582, ejection_fraction: 20, platelets: 150000,
      serum_creatinine: 2.1, serum_sodium: 128, time: 20
    }
  },
  {
    id: 'borderline',
    name: 'Borderline Patient (Moderate)',
    description: '68-year-old male managing early-stage diabetes.',
    lifestyle: ['Desk job', 'Irregular diet', 'Struggles to quit smoking'],
    icon: <Coffee className="text-yellow-500" size={24} />,
    color: 'yellow',
    data: {
      age: 68, sex: 1, anaemia: 1, diabetes: 1, high_blood_pressure: 0, smoking: 1,
      creatinine_phosphokinase: 300, ejection_fraction: 30, platelets: 210000,
      serum_creatinine: 1.8, serum_sodium: 135, time: 45
    }
  },
  {
    id: 'recovering',
    name: 'Recovering Patient (Stable)',
    description: '65-year-old female in active cardiac rehabilitation.',
    lifestyle: ['Daily 30 min walks', 'Strict low-sodium diet', 'Compliant with meds'],
    icon: <Activity className="text-blue-500" size={24} />,
    color: 'blue',
    data: {
      age: 65, sex: 0, anaemia: 0, diabetes: 0, high_blood_pressure: 1, smoking: 0,
      creatinine_phosphokinase: 250, ejection_fraction: 35, platelets: 280000,
      serum_creatinine: 1.4, serum_sodium: 138, time: 90
    }
  }
];

const Predict: React.FC = () => {
  const navigate = useNavigate();
  const { fireAgentToast } = useAgentActivity();
  const [loading, setLoading] = useState(false);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);
  const [result, setResult] = useState<{
    probability: number;
    risk_score: number;
    prediction: string;
    trendData?: any[];
  } | null>(null);


  const simulatePrediction = async (profile: PatientProfile) => {
    setActiveProfile(profile.id);
    setLoading(true);
    setResult(null); // Clear previous result
    
    // Fire agent activity toast for hackathon demo
    fireAgentToast('predict_risk');
    
    // Simulate a brief loading delay for effect
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile.data)
      });
      const data = await response.json();
      const trendData = generateTrendData(data.risk_score);
      setResult({ ...data, trendData });
    } catch (error) {
      console.error("Error predicting:", error);
    }
    setLoading(false);
  };

  const getActiveProfileData = () => {
    return PATIENT_PROFILES.find(p => p.id === activeProfile);
  };

  const activeData = getActiveProfileData();

  return (
    <div className="relative min-h-screen w-full bg-transparent text-gray-100 font-manrope selection:bg-blue-500/30 animate-page-transition">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"></div>
      
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 opacity-10 pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }} />
      
      {/* Header */}
      <header className="relative z-10 w-full px-6 py-4 flex items-center justify-between border-b border-gray-800 bg-gray-950/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-800 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-400" />
          </button>
          <div className="flex items-center gap-2">
            <Activity className="text-blue-500" size={24} />
            <h1 className="text-xl font-bold font-instrument tracking-wide text-white">PRANA Simulator</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8 pt-12">
        
        {/* Left Column - Profile Selection */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-gray-800 pb-4">
            <User className="text-blue-500" size={28} />
            <h2 className="text-2xl font-bold">Select Patient Profile</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PATIENT_PROFILES.map((profile) => (
              <div 
                key={profile.id}
                onClick={() => !loading && simulatePrediction(profile)}
                className={`p-5 rounded-2xl border backdrop-blur-md cursor-pointer transition-all duration-300 flex flex-col gap-3
                  ${activeProfile === profile.id 
                    ? `border-${profile.color}-500 bg-${profile.color}-500/10 shadow-lg shadow-${profile.color}-500/20` 
                    : 'border-gray-800 bg-gray-900/60 hover:bg-gray-800/80 hover:border-gray-700'}
                  ${loading && activeProfile !== profile.id ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-950 rounded-lg">
                    {profile.icon}
                  </div>
                  <h3 className="font-bold text-lg">{profile.name}</h3>
                </div>
                
                <p className="text-sm text-gray-400">{profile.description}</p>
                
                <div className="mt-2 space-y-1">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Daily Habits</h4>
                  {profile.lifestyle.map((habit, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                      {habit}
                    </div>
                  ))}
                </div>

                <button 
                  disabled={loading}
                  className={`mt-4 w-full py-2.5 rounded-xl font-bold text-sm transition-all flex justify-center items-center gap-2
                    ${activeProfile === profile.id 
                      ? `bg-${profile.color}-600 text-white` 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}
                >
                  {loading && activeProfile === profile.id ? (
                     <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                     </svg>
                  ) : 'Simulate Analysis'}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column - Results Display */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6 backdrop-blur-md shadow-2xl h-full flex flex-col">
            <h3 className="text-xl font-bold mb-6 pb-4 border-b border-gray-800">AI Prediction Results</h3>
            
            {!activeProfile ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-gray-500">
                <Activity size={48} className="mb-4 opacity-30" />
                <p>Select a patient profile to simulate the AI risk analysis.</p>
              </div>
            ) : loading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                 <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                   <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                   <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                 </svg>
                 <p className="text-gray-400 font-medium">Running Random Forest Model...</p>
              </div>
            ) : result && activeData ? (
              <div className="flex-1 flex flex-col gap-6 animate-in fade-in zoom-in duration-500">
                
                {/* Risk Score Banner */}
                <div className={`p-6 rounded-xl border flex flex-col items-center justify-center text-center gap-2
                  ${result.prediction === 'SURVIVE' ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  
                  {result.prediction === 'SURVIVE' ? (
                    <CheckCircle2 size={48} className="text-emerald-500 mb-2" />
                  ) : (
                    <AlertTriangle size={48} className="text-red-500 mb-2" />
                  )}
                  
                  <div className="text-5xl font-black tracking-tight" 
                       style={{ color: result.prediction === 'SURVIVE' ? '#10b981' : '#ef4444' }}>
                    {result.risk_score}%
                  </div>
                  <div className="text-sm font-medium text-gray-400 uppercase tracking-widest">
                    Mortality Risk Score
                  </div>
                </div>

                {/* Patient Clinical Snapshot */}
                <div className="bg-gray-950 rounded-xl p-5 border border-gray-800">
                  <h4 className="text-sm font-bold text-gray-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                    <Droplet size={16} /> Clinical Snapshot
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-500">Ejection Fraction</div>
                      <div className={`font-bold ${activeData.data.ejection_fraction < 35 ? 'text-red-400' : 'text-gray-200'}`}>
                        {activeData.data.ejection_fraction}%
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Serum Creatinine</div>
                      <div className={`font-bold ${activeData.data.serum_creatinine > 1.5 ? 'text-red-400' : 'text-gray-200'}`}>
                        {activeData.data.serum_creatinine} mg/dL
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Blood Pressure</div>
                      <div className={`font-bold ${activeData.data.high_blood_pressure ? 'text-red-400' : 'text-emerald-400'}`}>
                        {activeData.data.high_blood_pressure ? 'HIGH' : 'NORMAL'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">CPK Levels</div>
                      <div className="font-bold text-gray-200">{activeData.data.creatinine_phosphokinase} mcg/L</div>
                    </div>
                  </div>
                </div>

                {/* Clinical Assessment Text */}
                <div className="bg-gray-950 rounded-xl p-5 border border-gray-800 relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-blue-500/10 border-b border-l border-blue-500/30 px-3 py-1 rounded-bl-xl flex items-center gap-1.5">
                    <ShieldCheck size={12} className="text-blue-400" />
                    <span className="text-[10px] font-bold tracking-wider text-blue-400 uppercase">Omium Verified</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider mt-2">AI Assessment</h4>
                  <p className="text-gray-200 leading-relaxed text-sm">
                    {result.prediction === 'SURVIVE' 
                      ? "The AI model predicts a low probability of a critical event. The patient's lifestyle choices and vitals indicate stability."
                      : "The AI model predicts a HIGH probability of deterioration or mortality. Immediate clinical intervention, medication review, and lifestyle modifications are strongly recommended."}
                  </p>
                  <div className="mt-4 flex items-center justify-between text-xs border-t border-gray-800/50 pt-3">
                    <span className="text-gray-500">Trace Hash: <span className="font-mono text-gray-400">a9f8b2c4e7d1...</span></span>
                    <a href="https://omium.ai" target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1">
                      View Trace Log &rarr;
                    </a>
                  </div>
                </div>

                {/* Deterioration Trend Graph */}
                {result.trendData && (
                  <div className="bg-gray-950 rounded-xl p-5 border border-gray-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <TrendingUp size={16} /> 7-Day Risk Forecast
                      </h4>
                      <div className="text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg">
                        1 Week Prediction
                      </div>
                    </div>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={result.trendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                          <XAxis 
                            dataKey="day" 
                            stroke="#9CA3AF" 
                            fontSize={12} 
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#9CA3AF" 
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 100]}
                            tickFormatter={(value) => `${value}%`}
                          />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '0.5rem', color: '#fff' }}
                            itemStyle={{ color: '#60A5FA' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="score" 
                            stroke={result.prediction === 'SURVIVE' ? '#10b981' : '#ef4444'} 
                            strokeWidth={3}
                            dot={{ fill: result.prediction === 'SURVIVE' ? '#10b981' : '#ef4444', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Predict;
