import React, { useState, useEffect, useRef } from 'react';
import { HeartPulse, AlertTriangle, Phone, MessageSquare, CheckCircle2, User, Activity, BellRing, X, ArrowUpRight, ArrowDownRight, ArrowLeft, Globe, Watch, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentActivity } from '../AgentActivityToast';

// --- Types & Constants ---
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type VitalStatus = 'NORMAL' | 'WARNING' | 'DANGER';

interface Vital {
  id: string;
  name: string;
  unit: string;
  value: number;
  history: number[];
  status: VitalStatus;
  min: number;
  max: number;
}

const INITIAL_VITALS: Record<string, Vital> = {
  hr: { id: 'hr', name: 'Heart Rate', unit: 'bpm', value: 72, history: Array(10).fill(72), status: 'NORMAL', min: 40, max: 150 },
  ef: { id: 'ef', name: 'Ejection Fraction', unit: '%', value: 62, history: Array(10).fill(62), status: 'NORMAL', min: 10, max: 80 },
  creatinine: { id: 'creatinine', name: 'Serum Creatinine', unit: 'mg/dL', value: 0.9, history: Array(10).fill(0.9), status: 'NORMAL', min: 0, max: 4 },
  sodium: { id: 'sodium', name: 'Serum Sodium', unit: 'mEq/L', value: 140, history: Array(10).fill(140), status: 'NORMAL', min: 110, max: 160 },
  bp: { id: 'bp', name: 'Blood Pressure', unit: 'mmHg', value: 110, history: Array(10).fill(110), status: 'NORMAL', min: 60, max: 200 },
  glucose: { id: 'glucose', name: 'Blood Glucose', unit: 'mg/dL', value: 95, history: Array(10).fill(95), status: 'NORMAL', min: 40, max: 300 },
};

const SCENARIOS = {
  healthy: { hr: 72, ef: 62, creatinine: 0.9, sodium: 140, bp: 110, glucose: 95 },
  warning: { hr: 108, ef: 42, creatinine: 1.4, sodium: 133, bp: 145, glucose: 160 },
  critical: { hr: 138, ef: 22, creatinine: 2.8, sodium: 128, bp: 175, glucose: 210 },
};

// --- Components ---

const AnimatedNumber = ({ value, isDecimal = false }: { value: number, isDecimal?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    const duration = 500;
    const steps = 20;
    const stepTime = duration / steps;
    const diff = value - displayValue;

    if (diff === 0) return;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      setDisplayValue(prev => {
        const next = prev + (diff * progress);
        return currentStep === steps ? value : next;
      });
      if (currentStep >= steps) clearInterval(timer);
    }, stepTime);

    return () => clearInterval(timer);
  }, [value]);

  return <span>{isDecimal ? displayValue.toFixed(1) : Math.round(displayValue)}</span>;
};

const Sparkline = ({ data, min, max, color }: { data: number[], min: number, max: number, color: string }) => {
  const width = 100;
  const height = 30;

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    const normalizedVal = Math.max(min, Math.min(max, val));
    const y = height - ((normalizedVal - min) / (max - min) * height);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="transition-all duration-500 ease-in-out"
      />
    </svg>
  );
};

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { fireAgentToast } = useAgentActivity();
  const [vitals, setVitals] = useState(INITIAL_VITALS);
  const [scenario, setScenario] = useState<'healthy' | 'warning' | 'critical' | 'deteriorating'>('healthy');
  const [callLanguage, setCallLanguage] = useState<'en' | 'hi' | 'kn'>('en');

  const [dangerMode, setDangerMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalState, setModalState] = useState<'sending' | 'notified'>('sending');
  const [toasts, setToasts] = useState<{ id: number, message: string, icon: React.ReactNode }[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>(new Date().toLocaleTimeString());
  const deterioratingInterval = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioning = useRef(false);

  // Calculate risk score based on vitals
  const getRiskScore = () => {
    const isCritical = Object.values(vitals).some(v => v.status === 'DANGER');
    if (isCritical) return 89;
    if (vitals.hr.value >= 100 || vitals.ef.value <= 45) return 48;
    return 12;
  };
  const riskScore = getRiskScore();
  const riskColor = riskScore > 60 ? '#ef4444' : riskScore > 30 ? '#eab308' : '#22c55e';

  // Helper to determine status
  const getStatus = (id: string, val: number): VitalStatus => {
    if (id === 'hr') return val > 120 ? 'DANGER' : val > 100 ? 'WARNING' : 'NORMAL';
    if (id === 'ef') return val < 30 ? 'DANGER' : val < 50 ? 'WARNING' : 'NORMAL';
    if (id === 'creatinine') return val > 2.0 ? 'DANGER' : val > 1.2 ? 'WARNING' : 'NORMAL';
    if (id === 'sodium') return val < 130 ? 'DANGER' : val < 135 ? 'WARNING' : 'NORMAL';
    if (id === 'bp') return val > 160 ? 'DANGER' : val > 120 ? 'WARNING' : 'NORMAL';
    if (id === 'glucose') return val > 200 ? 'DANGER' : val > 140 ? 'WARNING' : 'NORMAL';
    return 'NORMAL';
  };

  const updateVitals = (targetValues: Record<string, number>) => {
    setVitals(prev => {
      const newVitals = { ...prev };
      Object.keys(targetValues).forEach(k => {
        const val = targetValues[k];
        const newHistory = [...prev[k].history.slice(1), val];
        newVitals[k] = { ...prev[k], value: val, history: newHistory, status: getStatus(k, val) };
      });
      return newVitals;
    });
  };

  const sendAlertsToBackend = async (patientName: string, currentVitals: Record<string, Vital>, currentRiskScore: number) => {

    const sendWithLocation = async (locationUrl: string) => {
      const message = `
Patient: ${patientName}
Risk Score: ${currentRiskScore}/100
Status: 🔴 DANGER ZONE

Critical Vitals:
❤️ Heart Rate: ${currentVitals.hr.value} bpm (DANGER)
💉 Ejection Fraction: ${currentVitals.ef.value}% (CRITICALLY LOW)
🩸 Serum Creatinine: ${currentVitals.creatinine.value} mg/dL (HIGH)
🧂 Serum Sodium: ${currentVitals.sodium.value} mEq/L (LOW)

📍 Location: ${locationUrl}

⚠️ Immediate intervention required!
      `.trim();

      try {
        // Send Pushbullet notification via backend
        await fetch(`${API_BASE}/pushbullet-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message })
        });

        setToasts(prev => [...prev, {
          id: Date.now(),
          message: "📱 Alert sent to Dr. Ramesh Kumar's phone",
          icon: <MessageSquare className="w-4 h-4" />
        }]);
      } catch (e) {
        console.error("Pushbullet error:", e);
      }

      try {
        // Trigger Twilio voice call via backend
        await fetch(`${API_BASE}/call-alert`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ risk_score: currentRiskScore, patient_name: patientName, language: callLanguage })
        });
      } catch (e) {
        console.error("Twilio error:", e);
      }
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          sendWithLocation(mapUrl);
        },
        (error) => {
          console.warn("Geolocation error:", error);
          sendWithLocation("https://www.google.com/maps?q=12.9716,77.5946 (Estimated)");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      sendWithLocation("Location not available");
    }
  };

  const triggerDangerAlert = () => {
    if (dangerMode) return;
    setDangerMode(true);
    setModalOpen(true);
    setModalState('sending');

    // Fire agent activity toast for hackathon demo
    fireAgentToast('twilio_alert');

    // Trigger real external alerts
    sendAlertsToBackend('Manthan G', vitals, riskScore);

    // Simulate staggered alerts
    let toastId = 0;
    setTimeout(() => {
      setToasts(prev => [...prev, { id: toastId++, message: "📱 SMS sent to emergency contact", icon: <MessageSquare className="w-4 h-4" /> }]);
    }, 1000);
    setTimeout(() => {
      setToasts(prev => [...prev, { id: toastId++, message: "📞 Call initiated to Dr. Ramesh Kumar", icon: <Phone className="w-4 h-4" /> }]);
    }, 2000);
    setTimeout(() => {
      setToasts(prev => [...prev, { id: toastId++, message: "🏥 Nearest hospital alerted: Manipal Hospital Bengaluru", icon: <Activity className="w-4 h-4" /> }]);
      setModalState('notified');
    }, 3000);
  };

  useEffect(() => {
    // Check if we hit critical natively
    const isCritical = Object.values(vitals).some(v => v.status === 'DANGER');
    if (isCritical && !dangerMode) {
      triggerDangerAlert();
    } else if (!isCritical && dangerMode) {
      setDangerMode(false);
      setModalOpen(false);
    }

    // Trigger sync animation
    setIsSyncing(true);
    setLastSyncTime(new Date().toLocaleTimeString());
    const syncTimer = setTimeout(() => setIsSyncing(false), 500);
    return () => clearTimeout(syncTimer);
  }, [vitals]);

  useEffect(() => {
    // Clear toast auto-dismiss
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  // Handle Scenarios
  const handleScenario = (type: 'healthy' | 'warning' | 'critical' | 'deteriorating') => {
    setScenario(type);
    if (deterioratingInterval.current) clearInterval(deterioratingInterval.current);

    if (type === 'healthy' || type === 'warning' || type === 'critical') {
      isTransitioning.current = true;
      const targetVitals = SCENARIOS[type];

      const startVals = {
        hr: vitals.hr.value,
        ef: vitals.ef.value,
        creatinine: vitals.creatinine.value,
        sodium: vitals.sodium.value,
        bp: vitals.bp.value,
        glucose: vitals.glucose.value,
      };

      const steps = 15;
      let currentStep = 0;

      deterioratingInterval.current = setInterval(() => {
        currentStep++;
        const progress = currentStep / steps;

        const currentVals = {
          hr: startVals.hr + (targetVitals.hr - startVals.hr) * progress,
          ef: startVals.ef + (targetVitals.ef - startVals.ef) * progress,
          creatinine: startVals.creatinine + (targetVitals.creatinine - startVals.creatinine) * progress,
          sodium: startVals.sodium + (targetVitals.sodium - startVals.sodium) * progress,
          bp: startVals.bp + (targetVitals.bp - startVals.bp) * progress,
          glucose: startVals.glucose + (targetVitals.glucose - startVals.glucose) * progress,
        };

        updateVitals(currentVals);

        if (currentStep >= steps) {
          isTransitioning.current = false;
          if (deterioratingInterval.current) clearInterval(deterioratingInterval.current);
        }
      }, 200);
    } else if (type === 'deteriorating') {
      isTransitioning.current = false;
      // Start at warning
      let currentVals = { ...SCENARIOS.warning };
      updateVitals(currentVals);

      deterioratingInterval.current = setInterval(() => {
        currentVals = {
          hr: Math.min(145, currentVals.hr + 5),
          ef: Math.max(15, currentVals.ef - 4),
          creatinine: Math.min(3.5, currentVals.creatinine + 0.3),
          sodium: Math.max(120, currentVals.sodium - 1.5),
          bp: Math.min(190, currentVals.bp + 6),
          glucose: Math.min(250, currentVals.glucose + 10),
        };
        updateVitals(currentVals);
      }, 3000);
    }
  };

  // Realistic Jitter Simulation
  useEffect(() => {
    if (scenario === 'deteriorating') return; // Handled separately

    const jitterInterval = setInterval(() => {
      if (isTransitioning.current) return;

      setVitals(prev => {
        const newVitals = { ...prev };

        // Define max jitter delta for each vital
        const jitterConfig: Record<string, number> = {
          hr: 2, // +/- 2 bpm
          ef: 1, // +/- 1 %
          creatinine: 0.05, // +/- 0.05
          sodium: 1, // +/- 1
          bp: 3, // +/- 3 mmHg
          glucose: 2, // +/- 2
        };

        Object.keys(newVitals).forEach(k => {
          const config = jitterConfig[k];
          // Generate a random float between -config and +config
          const delta = (Math.random() * 2 * config) - config;

          const baseValue = SCENARIOS[scenario as keyof typeof SCENARIOS][k as keyof typeof SCENARIOS.healthy];
          let newVal = prev[k].value + delta;

          // Clamp within +/- 3*config of the base value to prevent infinite drift
          const maxDrift = config * 3;
          if (newVal > baseValue + maxDrift) newVal = baseValue + maxDrift;
          if (newVal < baseValue - maxDrift) newVal = baseValue - maxDrift;

          // Also clamp to global min/max
          newVal = Math.max(prev[k].min, Math.min(prev[k].max, newVal));

          // Ensure ints for non-creatinine
          if (k !== 'creatinine') newVal = Math.round(newVal);
          else newVal = Number(newVal.toFixed(2));

          const newHistory = [...prev[k].history.slice(1), newVal];
          newVitals[k] = { ...prev[k], value: newVal, history: newHistory, status: getStatus(k, newVal) };
        });

        return newVitals;
      });
    }, 2000);

    return () => clearInterval(jitterInterval);
  }, [scenario]);

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (deterioratingInterval.current) clearInterval(deterioratingInterval.current);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-transparent text-gray-100 font-manrope selection:bg-blue-500/30 animate-page-transition">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"></div>

      {/* Danger Banner */}
      {dangerMode && (
        <div className="w-full bg-red-600 text-white py-3 px-6 flex items-center justify-center gap-3 animate-pulse z-50 relative shadow-lg shadow-red-900/50">
          <AlertTriangle className="w-6 h-6" />
          <span className="font-bold tracking-wide text-lg">🚨 CRITICAL: Patient vitals in danger zone</span>
        </div>
      )}

      {/* Patient Strip */}
      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-6 py-4 stagger-1">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="w-12 h-12 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center relative shadow-inner">
              <User className="w-6 h-6 text-gray-400" />
              <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-gray-900 transition-colors duration-500 ${dangerMode ? 'bg-red-500' : riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                Manthan G
                <span className="text-sm font-normal text-gray-400 px-2 py-0.5 bg-gray-800 rounded-md border border-gray-700">Age: 21</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5">
                Chronic Heart Failure • Attending: Dr. Ramesh Kumar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
              <Globe className="w-4 h-4 text-blue-500" />
              <select
                value={callLanguage}
                onChange={(e) => setCallLanguage(e.target.value as 'en' | 'hi' | 'kn')}
                className="bg-transparent text-gray-300 focus:outline-none cursor-pointer appearance-none"
              >
                <option value="en">English Audio</option>
                <option value="hi">Hindi Audio</option>
                <option value="kn">Kannada Audio</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
              <Activity className="w-4 h-4 text-blue-500" />
              Last checked: 2 minutes ago
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 stagger-2">

        {/* Left Column: Vitals & Scenarios */}
        <div className="lg:col-span-8 flex flex-col gap-8">

          {/* Scenarios Panel */}
          <section className="glass-card p-6 rounded-[24px]">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <HeartPulse className="w-4 h-4" /> Simulation Controls
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleScenario('healthy')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${scenario === 'healthy' ? 'bg-green-500/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
              >
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                Healthy Patient
              </button>
              <button
                onClick={() => handleScenario('warning')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${scenario === 'warning' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
              >
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                Early Warning
              </button>
              <button
                onClick={() => handleScenario('critical')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${scenario === 'critical' ? 'bg-red-500/20 border-red-500 text-red-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
              >
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                Critical Patient
              </button>
              <button
                onClick={() => handleScenario('deteriorating')}
                className={`p-3 rounded-xl border flex items-center gap-3 transition-all ${scenario === 'deteriorating' ? 'bg-orange-500/20 border-orange-500 text-orange-400' : 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-gray-300'}`}
              >
                <div className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></div>
                Deteriorating (Real-time)
              </button>
            </div>
          </section>

          {/* Vitals Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 stagger-3">
            {Object.values(vitals).map((vital) => {
              const isDanger = vital.status === 'DANGER';
              const isWarning = vital.status === 'WARNING';
              const colorClass = isDanger ? 'text-red-400' : isWarning ? 'text-yellow-400' : 'text-green-400';
              const bgClass = isDanger ? 'bg-red-500/10' : isWarning ? 'bg-yellow-500/10' : 'bg-green-500/10';
              const borderClass = isDanger ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]' : isWarning ? 'border-yellow-500/30' : 'border-gray-800';
              const sparklineColor = isDanger ? '#f87171' : isWarning ? '#facc15' : '#4ade80';

              // Trend indicator
              const lastVal = vital.history[vital.history.length - 2];
              const currVal = vital.value;
              const trendUp = currVal > lastVal;
              const trendSame = currVal === lastVal;

              return (
                <div key={vital.id} className={`glass-card rounded-[20px] p-5 transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-40 ${borderClass}`}>
                  {isDanger && <div className="absolute inset-0 bg-red-500/5 animate-pulse pointer-events-none"></div>}

                  <div className="flex justify-between items-start z-10">
                    <h3 className="text-gray-400 font-medium text-sm">{vital.name}</h3>
                    <div className={`px-2 py-0.5 rounded text-xs font-bold tracking-wider ${bgClass} ${colorClass}`}>
                      {vital.status}
                    </div>
                  </div>

                  <div className="flex items-end gap-2 z-10 my-2">
                    <div className={`text-4xl font-bold tracking-tight transition-colors duration-500 ${colorClass}`}>
                      <AnimatedNumber value={vital.value} isDecimal={vital.id === 'creatinine'} />
                    </div>
                    <div className="text-gray-500 font-medium mb-1 flex items-center gap-1">
                      {vital.unit}
                      {!trendSame && (
                        trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />
                      )}
                    </div>
                  </div>

                  <div className="w-full h-10 mt-auto opacity-70 z-10">
                    <Sparkline data={vital.history} min={vital.min} max={vital.max} color={sparklineColor} />
                  </div>
                </div>
              );
            })}
          </section>
        </div>

        {/* Right Column: Risk Score */}
        <div className="lg:col-span-4 stagger-4">
          <section className="glass-panel rounded-[32px] p-8 h-full flex flex-col items-center">
            <h2 className="text-lg font-bold text-white mb-8 self-start flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-500" />
              Patient Risk Score
            </h2>

            {/* Circular Gauge */}
            <div className="relative w-48 h-48 mb-8 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke="#1f2937"
                  strokeWidth="8"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="transparent"
                  stroke={riskColor}
                  strokeWidth="8"
                  strokeDasharray={`${(riskScore / 100) * 283} 283`}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-bold text-white tracking-tighter">
                  <AnimatedNumber value={riskScore} />
                </span>
                <span className="text-sm text-gray-400 mt-1 uppercase tracking-widest font-semibold">Risk</span>
              </div>
            </div>

            {/* SHAP Explainability Panel */}
            <div className="w-full bg-gray-950/50 rounded-2xl p-5 border border-gray-800/50 flex-grow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-300">AI Risk Factors</h3>
                <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">SHAP Explainable</span>
              </div>
              <ul className="space-y-3">
                {riskScore < 30 && (
                  <li className="flex items-start gap-3 text-sm text-gray-400">
                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" />
                    All vitals are stable and within normal ranges.
                  </li>
                )}
                {riskScore >= 30 && riskScore <= 60 && (
                  <>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <div>
                        <span className="text-yellow-400 font-semibold mr-1">↑</span>
                        Heart rate slightly elevated (108 bpm)
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <div>
                        <span className="text-yellow-400 font-semibold mr-1">↓</span>
                        Ejection Fraction reduced (42%)
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-yellow-500 flex-shrink-0"></div>
                      <div>
                        <span className="text-yellow-400 font-semibold mr-1">↑</span>
                        Blood Pressure elevated (145 mmHg)
                      </div>
                    </li>
                  </>
                )}
                {riskScore > 60 && (
                  <>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                      <div>
                        <span className="text-red-400 font-semibold mr-1">↓</span>
                        Ejection Fraction critically low (22%)
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                      <div>
                        <span className="text-red-400 font-semibold mr-1">↑</span>
                        Serum Creatinine elevated (2.8 mg/dL)
                      </div>
                    </li>
                    <li className="flex items-start gap-3 text-sm text-gray-300">
                      <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                      <div>
                        <span className="text-red-400 font-semibold mr-1">↑</span>
                        Heart rate dangerously high (138 bpm)
                      </div>
                    </li>
                  </>
                )}
              </ul>
            </div>

            {/* Smartwatch Sync Panel */}
            <div className="w-full bg-gray-950/50 rounded-2xl p-5 border border-gray-800/50 mt-4 flex-grow relative overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Watch className={`w-5 h-5 ${isSyncing ? 'text-blue-400' : 'text-gray-400'}`} />
                  <h3 className="text-sm font-bold text-gray-300">Wearable Link Simulation</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded ${isSyncing ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                    {isSyncing ? 'Syncing...' : 'Connected'}
                  </span>
                  <div className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-400 animate-ping' : 'bg-green-500'}`}></div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                  <span className="text-gray-500">Device</span>
                  <span className="text-gray-300 font-semibold flex items-center gap-1">Apple Watch Series 9 <CheckCircle2 className="w-3 h-3 text-green-500" /></span>
                </div>
                <div className="flex items-center justify-between text-xs border-b border-gray-800 pb-2">
                  <span className="text-gray-500">Last Sync</span>
                  <span className="text-gray-300 font-mono">{lastSyncTime}</span>
                </div>

                <div className="pt-2">
                  <p className="text-[10px] text-gray-500 font-bold uppercase mb-2 flex items-center gap-1">
                    <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin text-blue-400' : ''}`} /> Live Stream
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-gray-900 rounded p-2 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Heart Rate</p>
                      <p className={`text-sm font-bold font-mono transition-colors duration-300 ${isSyncing ? 'text-white' : 'text-gray-300'}`}>{vitals.hr.value} bpm</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Blood Pressure</p>
                      <p className={`text-sm font-bold font-mono transition-colors duration-300 ${isSyncing ? 'text-white' : 'text-gray-300'}`}>{vitals.bp.value} mmHg</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">Oxygen Sat</p>
                      <p className={`text-sm font-bold font-mono transition-colors duration-300 ${isSyncing ? 'text-white' : 'text-gray-300'}`}>98 %</p>
                    </div>
                    <div className="bg-gray-900 rounded p-2 border border-gray-800">
                      <p className="text-xs text-gray-500 mb-1">ECG</p>
                      <p className={`text-sm font-bold font-mono transition-colors duration-300 ${isSyncing ? 'text-green-400' : 'text-green-500'}`}>Sinus Rhy.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Emergency Notification Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 max-w-md w-full shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-6 border border-red-500/30">
              <BellRing className="w-8 h-8 text-red-500 animate-pulse" />
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">Emergency Alert Triggered</h2>
            <p className="text-gray-400 mb-8">Patient vitals have entered critical zones. Automating emergency protocols.</p>

            <div className="space-y-4">
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">Emergency Contact</h4>
                  <p className="text-gray-400 text-xs mt-0.5">Dr. Ramesh Kumar • +91 98765 43210</p>
                </div>
                {modalState === 'sending' ? (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    Sending...
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-400 text-sm font-medium animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Notified
                  </div>
                )}
              </div>

              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 flex items-center justify-between">
                <div>
                  <h4 className="text-white font-medium text-sm">Patient Contact</h4>
                  <p className="text-gray-400 text-xs mt-0.5">Manthan's Emergency Contact • +91 91414 73405</p>
                </div>
                {modalState === 'sending' ? (
                  <div className="flex items-center gap-2 text-blue-400 text-sm font-medium">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                    Calling...
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-400 text-sm font-medium animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Notified
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="mt-8 w-full py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-xl transition-colors border border-gray-700"
            >
              Dismiss Alert
            </button>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300">
            <div className="text-blue-400">
              {toast.icon}
            </div>
            <p className="text-sm font-medium pr-4">{toast.message}</p>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
