import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, MicOff, Save, FileText, 
  Stethoscope, AlertTriangle, CheckCircle2, Bot,
  Loader2, ClipboardList, User
} from 'lucide-react';
import { useAgentActivity } from '../AgentActivityToast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type PrescriptionItem = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing?: string;
  instructions?: string;
};

type Conflict = {
  pair: string;
  severity: 'high' | 'medium' | 'low';
  message: string;
};

type AnalysisResult = {
  summary: string;
  extracted_meds: string[];
  conflicts: Conflict[];
  prescription: PrescriptionItem[];
  reasoning: string;
};

const DEMO_CASES = [
  {
    language: 'English',
    patient_context: {
      name: 'John Doe',
      age: 58,
      diagnosis: 'Hypertension & Heart Failure',
      bp: '150/95',
      medications: ['Aspirin']
    },
    transcript: "Doctor: Good morning, John. How are you feeling today?\nPatient: Good morning Doctor. I've been having some chest pain and my legs are swelling a bit, especially around the ankles.\nDoctor: I see. How long has the swelling been happening?\nPatient: About three or four days now. It gets worse by the evening.\nDoctor: Your BP is high at 150/95, which explains the fluid retention. I'm prescribing Lasix 40mg once a day for 15 days for the swelling.\nPatient: Okay. Should I take it in the morning or at night?\nDoctor: Take it in the morning after food so you don't have to wake up to use the restroom. Let's also start Lisinopril 10mg for 30 days for your blood pressure to be taken at night before food."
  },
  {
    language: 'Hindi',
    patient_context: {
      name: 'Rajesh Kumar',
      age: 45,
      diagnosis: 'Type 2 Diabetes',
      bp: '130/85',
      medications: ['Glimepiride']
    },
    transcript: "Doctor: नमस्ते राजेश, आज आप कैसा महसूस कर रहे हैं?\nPatient: डॉक्टर साहब, मुझे थोड़ी थकान लग रही है और धड़कन तेज महसूस हो रही है।\nDoctor: धड़कन कब से तेज लग रही है आपको?\nPatient: पिछले दो दिनों से, खासकर जब मैं सीढ़ियां चढ़ता हूँ।\nDoctor: आपका ब्लड प्रेशर 130/85 है जो ठीक है। मैं मधुमेह के लिए Metformin 500mg दिन में दो बार खाने के बाद 30 दिन के लिए दे रहा हूँ।\nPatient: ठीक है डॉक्टर साहब।\nDoctor: और धड़कन को नियंत्रित करने के लिए Propranolol 20mg दिन में एक बार खाने से पहले 15 दिन के लिए लें। क्या आप पहले से कोई और दवा ले रहे हैं?\nPatient: सिर्फ Glimepiride 2mg ले रहा हूँ।"
  },
  {
    language: 'Kannada',
    patient_context: {
      name: 'Manjula S',
      age: 62,
      diagnosis: 'Asthma',
      bp: '120/80',
      medications: []
    },
    transcript: "Doctor: ನಮಸ್ಕಾರ ಮಂಜುಳಾ, ಹೇಗಿದ್ದೀರಾ?\nPatient: ನಮಸ್ಕಾರ ಡಾಕ್ಟರ್, ನನಗೆ ಸ್ವಲ್ಪ ಉಸಿರಾಟದ ತೊಂದರೆ ಇದೆ ಮತ್ತು ಕೆಮ್ಮು ಇದೆ.\nDoctor: ಇದು ಎಷ್ಟು ದಿನಗಳಿಂದ ಶುರುವಾಗಿದೆ? ರಾತ್ರಿ ಹೊತ್ತು ಜಾಸ್ತಿ ಆಗುತ್ತಾ?\nPatient: ಹೌದು ಡಾಕ್ಟರ್, ಮೂರು ದಿನಗಳಿಂದ. ರಾತ್ರಿ ಮಲಗಿದಾಗ ತುಂಬಾ ಕೆಮ್ಮು ಬರುತ್ತದೆ.\nDoctor: ನಿಮ್ಮ ಬಿಪಿ 120/80 ಇದೆ, ನಾರ್ಮಲ್ ಇದೆ. ಉಸಿರಾಟದ ತೊಂದರೆಗೆ ನಾನು Salbutamol inhaler 100mcg ಅನ್ನು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ 30 ದಿನಗಳವರೆಗೆ ಬರೆಯುತ್ತಿದ್ದೇನೆ.\nPatient: ಇನ್ಹೇಲರ್ ಅನ್ನು ಊಟದ ಮುಂಚೆ ತಗೋಬೇಕಾ?\nDoctor: ಊಟದ ನಂತರ ತಗೊಳ್ಳಿ. ಮತ್ತು ಕೆಮ್ಮಿಗೆ Benadryl ಸಿರಪ್ 5ml ರಾತ್ರಿ ಮಲಗುವ ಮುನ್ನ ಊಟದ ಮುಂಚೆ 5 ದಿನಗಳವರೆಗೆ ತೆಗೆದುಕೊಳ್ಳಿ."
  }
];

const parseTranscript = (text: string) => {
  if (!text) return [];
  const lines = text.split('\n');
  return lines.map(line => {
    if (line.startsWith('Doctor: ')) {
      return { sender: 'Doctor', text: line.replace('Doctor: ', '') };
    } else if (line.startsWith('Patient: ')) {
      return { sender: 'Patient', text: line.replace('Patient: ', '') };
    }
    return { sender: 'System', text: line };
  });
};

const Consultations: React.FC = () => {
  const navigate = useNavigate();
  const { fireAgentToast } = useAgentActivity();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [activePatientContext, setActivePatientContext] = useState<any>(null);

  // Web Speech API
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      if (transcript.length > 10) setStatus('processing');
    } else {
      setTranscript('');
      recognitionRef.current?.start();
      setIsRecording(true);
      setStatus('recording');
      setError('');
    }
  };

  const startAnalysis = async () => {
    if (!transcript) return;
    setIsAnalyzing(true);
    setStatus('processing');
    setError('');

    // Fire agent activity toast for hackathon demo
    fireAgentToast('consultation_analysis');

    try {
      const res = await fetch(`${API_BASE}/consultations/analyze-transcript`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, patient_id: 'demo-patient', patient_context: activePatientContext })
      });
      const data = await res.json();
      
      if (data.task_id) {
        pollStatus(data.task_id);
      } else {
        throw new Error('No task ID returned');
      }
    } catch (err) {
      setError('Analysis failed. Check backend connection.');
      setIsAnalyzing(false);
      setStatus('idle');
    }
  };

  const pollStatus = async (taskId: string) => {
    const url = `${API_BASE}/agents/status/${taskId}`;
    const maxRetries = 30;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        const r = await fetch(url);
        const j = await r.json();
        
        if (j.status === 'completed') {
          setResult(j.result);
          setIsAnalyzing(false);
          setStatus('completed');
          return;
        } else if (j.status === 'failed') {
          setError('Agent failed to analyze conversation.');
          setIsAnalyzing(false);
          setStatus('idle');
          return;
        }
      } catch (e) {
        console.error('Polling error', e);
      }
      await new Promise(res => setTimeout(res, 1500));
    }
    setError('Analysis timed out.');
    setIsAnalyzing(false);
    setStatus('idle');
  };

  const loadDemoTranscript = (demo: typeof DEMO_CASES[0]) => {
    setTranscript(demo.transcript);
    setActivePatientContext(demo.patient_context);
    setStatus('processing');
  };

  const resolveConflict = (conflictIdx: number, conflictPair: string, altName: string) => {
    if (!result) return;
    // Deep clone to avoid mutating React state
    const newResult = JSON.parse(JSON.stringify(result));
    
    // Attempt to replace the newly prescribed drug in the prescription array
    for (let i = 0; i < newResult.prescription.length; i++) {
      const medName = newResult.prescription[i].medicineName;
      const firstWord = medName.toLowerCase().split(' ')[0];
      
      // If the prescribed medicine is mentioned in the conflict pair, swap it
      if (conflictPair.toLowerCase().includes(firstWord)) {
        // Ensure we don't replace an existing patient medication
        const isExisting = activePatientContext?.medications?.some(
          (m: string) => m.toLowerCase().includes(firstWord)
        );
        
        if (!isExisting) {
          newResult.prescription[i].medicineName = altName;
          break; // Stop after replacing one drug to prevent duplicate identical entries
        }
      }
    }
    
    // Remove the resolved conflict
    newResult.conflicts.splice(conflictIdx, 1);
    setResult(newResult);
    
    // Simulate agent action
    fireAgentToast('consultation_analysis');
  };

  const handleSaveToScheduler = () => {
    if (!result || !result.prescription) return;
    
    const newMeds = result.prescription.map(med => ({
      ...med,
      patientName: activePatientContext?.name || 'Unknown Patient'
    }));
    
    localStorage.setItem('pending_prescriptions', JSON.stringify(newMeds));
    navigate('/scheduler');
  };

  return (
    <div className="relative min-h-screen w-full bg-transparent text-gray-100 font-manrope animate-page-transition">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md -z-10" />

      <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-400" />
                Clinical Consultations
              </h1>
              <p className="text-sm text-gray-400 mt-1">Record, analyze, and generate prescriptions with multi-agent intelligence.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Recording Section */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-8 flex flex-col items-center text-center">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500 ${isRecording ? 'bg-red-500/20 animate-pulse border-2 border-red-500/50' : 'bg-emerald-500/10 border border-emerald-500/30'}`}>
              {isRecording ? (
                <Mic className="w-10 h-10 text-red-500" />
              ) : (
                <Mic className="w-10 h-10 text-emerald-400" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {isRecording ? 'Recording Conversation...' : 'Start Consultation'}
            </h2>
            <p className="text-gray-400 text-sm mb-8 max-w-xs">
              {isRecording 
                ? 'Capture the clinical dialogue between the doctor and patient in real-time.' 
                : 'Click the button below to start recording the doctor-patient interaction.'}
            </p>

            <button 
              onClick={toggleRecording}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all ${isRecording ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
            >
              {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isRecording ? 'Stop & Process' : 'Start Recording'}
            </button>

            <div className="w-full mt-6">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3 text-left">Select Demo Patient</p>
              <div className="flex flex-col gap-2">
                {DEMO_CASES.map((demo, idx) => (
                  <button
                    key={idx}
                    onClick={() => loadDemoTranscript(demo)}
                    className={`flex items-center gap-3 text-left hover:bg-gray-700 border rounded-xl p-3 transition-colors ${activePatientContext?.name === demo.patient_context.name ? 'border-blue-500/50 bg-blue-500/10' : 'bg-gray-800/50 border-gray-700'}`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white flex items-center gap-2">
                        {demo.patient_context.name} <span className="text-gray-500 font-normal">({demo.patient_context.age}y)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase">{demo.language}</span>
                      </div>
                      <div className="text-[11px] text-gray-400">{demo.patient_context.diagnosis} • BP: {demo.patient_context.bp}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-400" />
                Live Transcript
              </h3>
              {transcript && (
                 <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Live</span>
              )}
            </div>
            <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4 min-h-[250px] max-h-[400px] overflow-auto flex flex-col gap-3">
              {transcript ? (
                parseTranscript(transcript).map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.sender === 'Patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                      msg.sender === 'Doctor' 
                        ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-100 rounded-tl-sm' 
                        : msg.sender === 'Patient'
                          ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-tr-sm'
                          : 'bg-gray-800 text-gray-300'
                    }`}>
                      <span className={`text-[10px] uppercase font-bold opacity-60 block mb-1 ${msg.sender === 'Patient' ? 'text-right' : 'text-left'}`}>{msg.sender}</span>
                      {msg.text}
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 italic text-sm">
                  Waiting for audio input or demo selection...
                </div>
              )}
            </div>
            {transcript && !isRecording && (
              <button 
                onClick={startAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/20"
              >
                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Bot className="w-5 h-5" />}
                {isAnalyzing ? 'Analyzing with Multi-Agent AI...' : 'Analyze Consultation'}
              </button>
            )}
          </div>
        </section>

        {/* Results Section */}
        <section className="lg:col-span-7 flex flex-col gap-6">
          {!result && !isAnalyzing && (
            <div className="bg-gray-900/40 border-2 border-dashed border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center text-gray-500 h-full">
              <ClipboardList className="w-16 h-16 mb-4 opacity-20" />
              <p className="max-w-xs">Analysis results, drug conflict checks, and generated prescriptions will appear here.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-12 flex flex-col items-center justify-center text-center h-full animate-pulse">
              <Bot className="w-16 h-16 mb-6 text-blue-400" />
              <h3 className="text-xl font-bold text-white mb-2">AI Agent at Work</h3>
              <p className="text-gray-400 text-sm max-w-sm">
                PRANA's consultation agent is decomposing the transcript, checking patient history, and screening for pharmacological conflicts...
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
              {/* Summary Card */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                   <Bot className="w-5 h-5 text-blue-400" />
                   AI Synthesis & Reasoning
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{result.summary}</p>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-300 italic">
                  <strong>Reasoning:</strong> {result.reasoning}
                </div>
              </div>

              {/* Conflicts Alert */}
              {result.conflicts && result.conflicts.length > 0 ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-3xl p-6">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Drug Conflict Warnings ({result.conflicts.length})
                  </h3>
                  <div className="space-y-3">
                    {result.conflicts.map((conflict, idx) => {
                      // Generate contextual alternatives based on the conflict for the demo
                      const isBeta = conflict.pair.toLowerCase().includes('propranolol');
                      const alts = isBeta ? ['Metoprolol', 'Atenolol', 'Carvedilol'] : ['Losartan', 'Valsartan', 'Amlodipine'];
                      
                      return (
                      <div key={idx} className="bg-gray-950/80 border border-red-500/20 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-sm">{conflict.pair}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${conflict.severity === 'high' ? 'bg-red-600 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                            {conflict.severity} Risk
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mb-4">{conflict.message}</p>
                        
                        <div className="pt-3 border-t border-red-500/20">
                          <p className="text-[10px] uppercase text-red-300 font-bold mb-2">Resolve Conflict: Select Safe Alternative</p>
                          <div className="flex flex-wrap gap-2">
                            {alts.map(alt => (
                              <button 
                                key={alt}
                                onClick={() => resolveConflict(idx, conflict.pair, alt)} 
                                className="text-xs bg-gray-900 hover:bg-emerald-600/20 hover:text-emerald-400 hover:border-emerald-500/30 text-gray-300 px-3 py-1.5 rounded-lg border border-gray-700 transition-all"
                              >
                                {alt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 flex items-center gap-3">
                   <CheckCircle2 className="text-emerald-400 w-6 h-6" />
                   <div className="text-sm font-semibold text-emerald-100">No drug-drug interactions detected for this patient.</div>
                </div>
              )}

              {/* Realistic Prescription UI */}
              <div className="bg-[#f8fafc] rounded-xl p-8 shadow-2xl relative overflow-hidden font-sans text-gray-800 mt-8 max-w-2xl mx-auto border-t-[12px] border-blue-700">
                
                {/* Header */}
                <div className="flex justify-between items-start mb-6 border-b-2 border-gray-200 pb-4">
                  <div>
                    <h2 className="text-3xl font-bold text-blue-900 tracking-tight">PRANA CLINIC</h2>
                    <p className="text-sm text-gray-600 font-semibold mt-1">Dr. Ramesh Kumar, MD</p>
                    <p className="text-xs text-gray-500">Cardiology & General Medicine</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-700">Date: {new Date().toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500 mt-1">123 Health Ave, Bangalore</p>
                    <p className="text-xs text-gray-500">+91 98765 43210</p>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="flex justify-between items-center bg-gray-100 p-4 rounded-lg mb-8 border border-gray-200">
                  <div>
                    <p className="text-sm text-gray-800"><span className="font-bold text-gray-600">Patient Name:</span> {activePatientContext?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-800 mt-1"><span className="font-bold text-gray-600">Age:</span> {activePatientContext?.age || '--'} yrs</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-800"><span className="font-bold text-gray-600">Blood Pressure:</span> {activePatientContext?.bp || '--'}</p>
                    <p className="text-sm text-gray-800 mt-1"><span className="font-bold text-gray-600">Diagnosis:</span> {activePatientContext?.diagnosis || '--'}</p>
                  </div>
                </div>

                {/* Rx Symbol */}
                <div className="text-6xl font-serif font-bold text-blue-900 italic mb-6 pl-2 opacity-90">
                  Rx
                </div>

                {/* Medications List */}
                <div className="space-y-6 mb-16 px-6">
                  {result.prescription.map((med, idx) => (
                    <div key={idx} className="flex gap-4 border-b border-gray-100 pb-4 last:border-0">
                      <div className="text-xl font-bold text-gray-400 mt-0.5">{idx + 1}.</div>
                      <div className="flex-1">
                        <div className="flex items-baseline justify-between mb-1">
                          <h4 className="text-xl font-bold text-gray-900">{med.medicineName}</h4>
                          <span className="text-sm font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">{med.dosage}</span>
                        </div>
                        <p className="text-gray-800 text-sm mt-2">
                          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mr-2">Sig</span> 
                          {med.frequency} {med.timing ? `- ${med.timing}` : ''}
                        </p>
                        {med.instructions && (
                          <p className="text-gray-800 text-sm mt-1">
                            <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mr-2">Instructions</span> 
                            {med.instructions}
                          </p>
                        )}
                        <p className="text-gray-600 text-sm mt-1">
                          <span className="font-bold text-gray-500 uppercase tracking-wider text-[10px] mr-2">Dispense</span> 
                          For {med.duration}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Signature */}
                <div className="mt-8 flex justify-between items-end border-t border-gray-200 pt-6">
                  <div className="flex gap-3">
                    <button onClick={handleSaveToScheduler} className="flex items-center gap-2 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/20 transition-all">
                      <Save className="w-4 h-4" /> Save to Scheduler
                    </button>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl text-blue-900 mb-1" style={{ fontFamily: "'Brush Script MT', 'Dancing Script', cursive" }}>Ramesh Kumar</div>
                    <div className="border-t-2 border-gray-400 w-48 mx-auto"></div>
                    <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-widest font-bold">Doctor's Signature</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 flex items-center gap-3 text-red-300 text-sm">
               <AlertTriangle className="w-5 h-5 flex-shrink-0" />
               {error}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Consultations;
