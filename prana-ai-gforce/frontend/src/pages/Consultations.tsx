import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mic, MicOff, Play, Save, FileText, 
  Stethoscope, AlertTriangle, CheckCircle2, Bot,
  Loader2, ClipboardList, Pill, User
} from 'lucide-react';
import { useAgentActivity } from '../AgentActivityToast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type PrescriptionItem = {
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
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

const Consultations: React.FC = () => {
  const navigate = useNavigate();
  const { fireAgentToast } = useAgentActivity();
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'recording' | 'processing' | 'completed'>('idle');

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
        body: JSON.stringify({ transcript, patient_id: 'demo-patient' })
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

  const loadDemoTranscript = () => {
    const demo = "Doctor: Good morning, Manthan. How are you feeling today?\nPatient: I've been having some chest pain and my legs are swelling a bit.\nDoctor: I see. Your latest vitals show some fluid retention. I'm going to prescribe you Lasix 40mg once a day to help with the swelling. Also, let's start you on Lisinopril 10mg for your blood pressure. Are you still taking your Aspirin?\nPatient: Yes, I take one every morning.\nDoctor: Good. Let's keep that going. I'll send the new prescriptions over now.";
    setTranscript(demo);
    setStatus('processing');
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
          <div className="flex gap-3">
             <button 
              onClick={loadDemoTranscript}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-semibold border border-gray-700 transition-all"
            >
              Load Demo Case
            </button>
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
            <div className="bg-gray-950/50 border border-gray-800 rounded-xl p-4 min-h-[200px] max-h-[300px] overflow-auto">
              {transcript ? (
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{transcript}</p>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-600 italic text-sm">
                  Waiting for audio input...
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
                    {result.conflicts.map((conflict, idx) => (
                      <div key={idx} className="bg-gray-950/80 border border-red-500/20 rounded-2xl p-4">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-white text-sm">{conflict.pair}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${conflict.severity === 'high' ? 'bg-red-600 text-white' : 'bg-orange-500/20 text-orange-400'}`}>
                            {conflict.severity} Risk
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{conflict.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-4 flex items-center gap-3">
                   <CheckCircle2 className="text-emerald-400 w-6 h-6" />
                   <div className="text-sm font-semibold text-emerald-100">No drug-drug interactions detected for this patient.</div>
                </div>
              )}

              {/* Prescription Card */}
              <div className="bg-gray-900/80 border border-gray-800 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <Pill className="w-6 h-6 text-emerald-400" />
                    Generated Prescription
                  </h3>
                  <button className="flex items-center gap-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                    <Save className="w-4 h-4" /> Save to EMR
                  </button>
                </div>
                
                <div className="space-y-4">
                  {result.prescription.map((med, idx) => (
                    <div key={idx} className="bg-gray-950/50 border border-gray-800 rounded-2xl p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                          <Pill className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                          <div className="font-bold text-white">{med.medicineName}</div>
                          <div className="text-xs text-gray-500">{med.dosage} — {med.duration}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold text-emerald-400">{med.frequency}</div>
                        <div className="text-[10px] text-gray-600 uppercase font-bold">Frequency</div>
                      </div>
                    </div>
                  ))}
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
