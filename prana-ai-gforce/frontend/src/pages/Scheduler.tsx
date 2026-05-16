import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Camera, UploadCloud, CheckCircle2,
  Trash2, Pause, Play, Zap, Phone, MessageSquare,
  Clock, Calendar, FileText, Activity, ChevronDown, ChevronUp, X, User, AlertTriangle, Bot, Send
} from 'lucide-react';

interface Schedule {
  id: string;
  patientName: string;
  medicineName: string;
  dosage: string;
  times: string[]; // HH:mm format
  notifications: { pushbullet: boolean; phone: boolean };
  startDate: string;
  duration: 'until_cancelled' | number;
  instructions: string;
  active: boolean;
}

const INITIAL_SCHEDULES: Schedule[] = [
  {
    id: '1',
    patientName: 'Manthan G',
    medicineName: 'Metformin',
    dosage: '500mg',
    times: ['08:00', '20:00'],
    notifications: { pushbullet: true, phone: true },
    startDate: new Date().toISOString().split('T')[0],
    duration: 'until_cancelled',
    instructions: 'Take after meals',
    active: true
  },
  {
    id: '2',
    patientName: 'Manthan G',
    medicineName: 'Amlodipine',
    dosage: '5mg',
    times: ['09:00'],
    notifications: { pushbullet: true, phone: false },
    startDate: new Date().toISOString().split('T')[0],
    duration: 'until_cancelled',
    instructions: '',
    active: true
  },
  {
    id: '3',
    patientName: 'Manthan G',
    medicineName: 'Aspirin',
    dosage: '75mg',
    times: ['22:00'],
    notifications: { pushbullet: true, phone: true },
    startDate: new Date().toISOString().split('T')[0],
    duration: 'until_cancelled',
    instructions: 'Take before sleep',
    active: true
  }
];

const Scheduler: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [schedules, setSchedules] = useState<Schedule[]>(INITIAL_SCHEDULES);
  const [toasts, setToasts] = useState<{ id: number, message: string, icon: React.ReactNode }[]>([]);
  const [now, setNow] = useState(new Date());
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Upload State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [prescriptionFile, setPrescriptionFile] = useState<File | null>(null);

  // Form State
  const [formPatient, setFormPatient] = useState('Manthan G');
  const [formMedicine, setFormMedicine] = useState('');
  const [formDosage, setFormDosage] = useState('');
  const [formFrequency, setFormFrequency] = useState<'once' | 'twice' | 'three' | 'custom'>('once');
  const [formTimes, setFormTimes] = useState<string[]>(['09:00']);
  const [formPushbullet, setFormPushbullet] = useState(true);
  const [formPhone, setFormPhone] = useState(true);
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDurationType, setFormDurationType] = useState<'until_cancelled' | 'fixed'>('until_cancelled');
  const [formDurationDays, setFormDurationDays] = useState('30');
  const [formInstructions, setFormInstructions] = useState('');

  // Chatbot State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user'|'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hello! I am your AI medical assistant. Ask me what medicine you should take next or about your diet.' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsTyping(true);

    try {
      const scheduleContext = schedules.map(s => `Medicine: ${s.medicineName}, Dosage: ${s.dosage}, Times: ${s.times.join(', ')}, Instructions: ${s.instructions || 'None'}`).join('\n');
      const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      const payload = {
        message: userMsg,
        context: `CURRENT TIME: ${currentTime}\n\nMEDICATION SCHEDULE:\n${scheduleContext || "No active schedules currently."}`,
        history: chatMessages.slice(1).map(m => ({ role: m.role, content: m.content }))
      };

      const response = await fetch('http://localhost:8000/chat-prescription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      
      if (data.error) {
         setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
      } else {
         setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I am having trouble connecting to the server.' }]);
    }
    
    setIsTyping(false);
  };

  // Refs for timeouts
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // Clock interval for UI updates
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000); // update every minute
    return () => clearInterval(timer);
  }, []);

  // Toast Auto-dismiss
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts(prev => prev.slice(1));
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  const showToast = (message: string, icon: React.ReactNode) => {
    setToasts(prev => [...prev, { id: Date.now() + Math.random(), message, icon }]);
  };

  // Import pending prescriptions from Consultations page
  useEffect(() => {
    const pendingStr = localStorage.getItem('pending_prescriptions');
    if (pendingStr) {
      try {
        const pendingMeds = JSON.parse(pendingStr);
        const newSchedules: Schedule[] = pendingMeds.map((med: any, idx: number) => {
          let times = ['09:00'];
          if (med.timeOfDay && Array.isArray(med.timeOfDay) && med.timeOfDay.length > 0) {
            times = med.timeOfDay.map((t: string) => {
              const lower = t.toLowerCase();
              if (lower.includes('morning')) return '09:00';
              if (lower.includes('afternoon')) return '14:00';
              if (lower.includes('evening') || lower.includes('night')) return '21:00';
              return '09:00';
            });
          }

          return {
            id: Date.now() + '-' + idx,
            patientName: med.patientName || 'Unknown',
            medicineName: med.medicineName || 'Unknown Medicine',
            dosage: med.dosage || '',
            times: Array.from(new Set(times)),
            notifications: { pushbullet: true, phone: true },
            startDate: new Date().toISOString().split('T')[0],
            duration: med.duration || 'until_cancelled',
            instructions: med.timing ? `${med.frequency} - ${med.timing}. ${med.instructions || ''}` : med.instructions || '',
            active: true
          };
        });

        setSchedules(prev => [...prev, ...newSchedules]);
        localStorage.removeItem('pending_prescriptions');
        
        // Use timeout to ensure toast renders
        setTimeout(() => {
          showToast(`✅ Added ${newSchedules.length} medicines from consultation!`, <CheckCircle2 className="w-4 h-4" />);
        }, 500);
      } catch (e) {
        console.error("Error parsing pending prescriptions", e);
      }
    }
  }, []);

  // Trigger Notifications
  const triggerNotification = async (schedule: Schedule, _time: string) => {
    if (!schedule.active) return;

    // In-app Toast
    showToast(`💊 Reminder sent to ${schedule.patientName} — ${schedule.medicineName} ${schedule.dosage}`, <Activity className="w-4 h-4" />);

    // Pushbullet
    if (schedule.notifications.pushbullet) {
      try {
        await fetch('http://localhost:8000/pushbullet-alert', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Time to take your ${schedule.medicineName} ${schedule.dosage}\nSpecial instructions: ${schedule.instructions || 'None'}\nStay healthy! — Prana`
          })
        });
      } catch (e) {
        console.error("Pushbullet error", e);
      }
    }

    // Phone Call
    if (schedule.notifications.phone) {
      try {
        await fetch('http://localhost:8000/medicine-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            medicine_name: schedule.medicineName,
            dosage: schedule.dosage,
            patient_name: schedule.patientName,
            instructions: schedule.instructions
          })
        });
      } catch (e) {
        console.error("Twilio error", e);
      }
    }
  };

  // Schedule Timeouts Logic
  useEffect(() => {
    // Clear existing timeouts
    Object.values(timeoutsRef.current).forEach(clearTimeout);
    timeoutsRef.current = {};

    const currentMs = Date.now();

    schedules.forEach(schedule => {
      if (!schedule.active) return;

      schedule.times.forEach((timeStr, index) => {
        const [hours, mins] = timeStr.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(hours, mins, 0, 0);

        let targetMs = targetDate.getTime();

        // If time already passed today, schedule for tomorrow
        if (targetMs <= currentMs) {
          targetMs += 24 * 60 * 60 * 1000;
        }

        const delay = targetMs - currentMs;
        const timeoutId = setTimeout(() => {
          triggerNotification(schedule, timeStr);
          // Reschedule for next day could be done here, but let's rely on daily re-evaluation or explicit triggers for demo
        }, delay);

        timeoutsRef.current[`${schedule.id}-${index}`] = timeoutId;
      });
    });

    return () => {
      Object.values(timeoutsRef.current).forEach(clearTimeout);
    };
  }, [schedules]);

  // Demo Button Action
  const handleTestNotification = async () => {
    showToast("🧪 Test notification sent! Check your phone.", <Zap className="w-4 h-4" />);

    // Test payload
    const testPayload = {
      medicineName: "Test Medicine",
      dosage: "1 dose",
      patientName: "Manthan G",
      instructions: "This is a live demo test.",
      notifications: { pushbullet: true, phone: true },
      active: true,
      id: 'test',
      times: [],
      startDate: '',
      duration: 'until_cancelled' as const
    };

    await triggerNotification(testPayload, "now");
  };

  // Form Handlers
  const handleFrequencyChange = (freq: 'once' | 'twice' | 'three' | 'custom') => {
    setFormFrequency(freq);
    if (freq === 'once') setFormTimes(['09:00']);
    else if (freq === 'twice') setFormTimes(['08:00', '20:00']);
    else if (freq === 'three') setFormTimes(['08:00', '14:00', '20:00']);
    else setFormTimes(['09:00']);
  };

  const handleTimeChange = (index: number, val: string) => {
    const newTimes = [...formTimes];
    newTimes[index] = val;
    setFormTimes(newTimes);
  };

  const addTime = () => {
    if (formTimes.length < 4) setFormTimes([...formTimes, '12:00']);
  };

  const removeTime = (index: number) => {
    const newTimes = [...formTimes];
    newTimes.splice(index, 1);
    setFormTimes(newTimes);
  };

  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formMedicine || !formDosage) return;

    const newSchedule: Schedule = {
      id: Date.now().toString(),
      patientName: formPatient,
      medicineName: formMedicine,
      dosage: formDosage,
      times: [...formTimes].sort(),
      notifications: { pushbullet: formPushbullet, phone: formPhone },
      startDate: formStartDate,
      duration: formDurationType === 'fixed' ? parseInt(formDurationDays) || 30 : 'until_cancelled',
      instructions: formInstructions,
      active: true
    };

    setSchedules([...schedules, newSchedule]);

    // Reset form
    setFormMedicine('');
    setFormDosage('');
    setFormInstructions('');

    showToast(`✅ Added ${formMedicine} to schedule`, <CheckCircle2 className="w-4 h-4" />);
  };

  const toggleScheduleActive = (id: string) => {
    setSchedules(schedules.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  const deleteSchedule = (id: string) => {
    if (window.confirm("Are you sure you want to delete this medication schedule?")) {
      setSchedules(schedules.filter(s => s.id !== id));
    }
  };

  // File Upload Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPrescriptionFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzePrescription = async () => {
    if (!prescriptionFile) return;
    setIsAnalyzing(true);

    try {
      const formData = new FormData();
      formData.append('file', prescriptionFile);

      const response = await fetch('http://localhost:8000/analyze-prescription', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to analyze');

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      const parsedSchedules: Schedule[] = data.map((med: any, index: number) => {
        let times = ['09:00'];
        if (med.timeOfDay && Array.isArray(med.timeOfDay) && med.timeOfDay.length > 0) {
          times = med.timeOfDay.map((t: string) => {
            const lower = t.toLowerCase();
            if (lower.includes('morning')) return '09:00';
            if (lower.includes('afternoon')) return '14:00';
            if (lower.includes('evening') || lower.includes('night')) return '21:00';
            return '09:00';
          });
        }

        return {
          id: Date.now() + index.toString(),
          patientName: 'Manthan G', // Default patient name for context
          medicineName: med.medicineName || 'Unknown Medicine',
          dosage: med.dosage || '',
          times: Array.from(new Set(times)), // Unique times
          notifications: { pushbullet: true, phone: true },
          startDate: new Date().toISOString().split('T')[0],
          duration: med.duration || 'until_cancelled',
          instructions: med.frequency || '',
          active: true
        };
      });

      setSchedules([...schedules, ...parsedSchedules]);
      showToast(`✅ Prescription analyzed! ${parsedSchedules.length} medicines detected.`, <CheckCircle2 className="w-4 h-4" />);
      setActiveTab('manual');
      setPrescriptionFile(null);
      setPreviewImage(null);
    } catch (e) {
      console.error(e);
      showToast("❌ Failed to analyze prescription. Please ensure the backend is running.", <AlertTriangle className="w-4 h-4" />);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Utility to format next dose string
  const getNextDoseString = (times: string[]) => {
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const currentTotal = currentH * 60 + currentM;

    let isTomorrow = true;
    let minDiff = Infinity;

    for (const t of times) {
      const [h, m] = t.split(':').map(Number);
      const total = h * 60 + m;
      if (total > currentTotal && total - currentTotal < minDiff) {
        minDiff = total - currentTotal;
        isTomorrow = false;
      }
    }

    if (isTomorrow) {
      const [h, m] = times[0].split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const formattedH = h % 12 || 12;
      return `Tomorrow ${formattedH}:${m.toString().padStart(2, '0')} ${ampm}`;
    }

    const hours = Math.floor(minDiff / 60);
    const mins = minDiff % 60;

    if (hours > 0) {
      return `in ${hours} hr ${mins > 0 ? `${mins} min` : ''}`;
    }
    return `in ${mins} min`;
  };

  const formatAmPm = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedH = h % 12 || 12;
    return `${formattedH}:${m.toString().padStart(2, '0')} ${ampm}`;
  };

  return (
    <div className="relative min-h-screen w-full bg-transparent text-gray-100 font-manrope selection:bg-blue-500/30 animate-page-transition">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm -z-10"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
              title="Return to Home"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              Smart Medicine Scheduler
            </h1>
          </div>
          <button
            onClick={handleTestNotification}
            className="flex items-center gap-2 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/50 px-4 py-2 rounded-lg font-semibold text-sm transition-colors"
          >
            <Zap className="w-4 h-4" />
            Test Notification Now
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <section className="bg-gray-900 rounded-2xl border border-gray-800 shadow-xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-gray-800 flex items-center gap-2">
              <span className="text-xl">💊</span>
              <h2 className="text-lg font-bold text-white">Add Medication Schedule</h2>
            </div>

            <div className="flex border-b border-gray-800">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'upload' ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
              >
                <Camera className="w-4 h-4" /> Upload Prescription
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'manual' ? 'bg-blue-600/10 text-blue-500 border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-300'}`}
              >
                <FileText className="w-4 h-4" /> Manual Entry
              </button>
            </div>

            <div className="p-6">
              {activeTab === 'upload' && (
                <div className="flex flex-col gap-4 animate-in fade-in duration-300">
                  <label className="relative flex flex-col items-center justify-center w-full h-48 border-2 border-gray-700 border-dashed rounded-xl cursor-pointer bg-gray-800/50 hover:bg-gray-800 transition-colors overflow-hidden group">
                    {previewImage ? (
                      <img src={previewImage} alt="Prescription" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" />
                    ) : (
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="mb-2 text-sm text-gray-400 font-semibold">Drop prescription image here</p>
                        <p className="text-xs text-gray-500">or click to upload (jpg, png, pdf)</p>
                      </div>
                    )}
                    <input type="file" className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
                  </label>

                  {previewImage && (
                    <button
                      onClick={handleAnalyzePrescription}
                      disabled={isAnalyzing}
                      className="w-full flex justify-center items-center gap-2 bg-[#2563eb] hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Reading prescription...
                        </>
                      ) : (
                        <>
                          <Activity className="w-5 h-5" />
                          Analyze Prescription
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {activeTab === 'manual' && (
                <form onSubmit={handleAddSchedule} className="flex flex-col gap-5 animate-in fade-in duration-300">
                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-1">Patient Name</label>
                    <input type="text" value={formPatient} onChange={(e) => setFormPatient(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-1">Medicine Name</label>
                      <input required type="text" value={formMedicine} onChange={(e) => setFormMedicine(e.target.value)} placeholder="e.g. Metformin" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-1">Dosage</label>
                      <input required type="text" value={formDosage} onChange={(e) => setFormDosage(e.target.value)} placeholder="e.g. 500mg" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-1">Frequency</label>
                    <select value={formFrequency} onChange={(e) => handleFrequencyChange(e.target.value as any)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                      <option value="once">Once daily</option>
                      <option value="twice">Twice daily</option>
                      <option value="three">Three times daily</option>
                      <option value="custom">Custom times</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-1 flex justify-between">
                      Dose Times
                      {formFrequency === 'custom' && formTimes.length < 4 && (
                        <button type="button" onClick={addTime} className="text-blue-500 text-xs hover:underline">+ Add Time</button>
                      )}
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {formTimes.map((time, idx) => (
                        <div key={idx} className="relative flex items-center">
                          <input type="time" required value={time} onChange={(e) => handleTimeChange(idx, e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500 css-time-input" />
                          {formFrequency === 'custom' && formTimes.length > 1 && (
                            <button type="button" onClick={() => removeTime(idx)} className="absolute right-2 text-gray-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-2">Notification Method</label>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => setFormPushbullet(!formPushbullet)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${formPushbullet ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        <MessageSquare className="w-4 h-4" /> Pushbullet
                      </button>
                      <button type="button" onClick={() => setFormPhone(!formPhone)} className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg border transition-colors ${formPhone ? 'bg-green-600/20 border-green-500 text-green-400' : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                        <Phone className="w-4 h-4" /> Phone Call
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-1">Start Date</label>
                      <input type="date" required value={formStartDate} onChange={(e) => setFormStartDate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 css-time-input" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-400 mb-1">Duration</label>
                      <select value={formDurationType} onChange={(e) => setFormDurationType(e.target.value as any)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none">
                        <option value="until_cancelled">Until Cancelled</option>
                        <option value="fixed">Fixed Duration</option>
                      </select>
                    </div>
                  </div>
                  {formDurationType === 'fixed' && (
                    <div className="animate-in slide-in-from-top-2">
                      <label className="block text-sm font-semibold text-gray-400 mb-1">Days</label>
                      <input type="number" min="1" value={formDurationDays} onChange={(e) => setFormDurationDays(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-400 mb-1">Special Instructions (Optional)</label>
                    <textarea rows={2} value={formInstructions} onChange={(e) => setFormInstructions(e.target.value)} placeholder="e.g. Take after meals, avoid dairy" className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 resize-none"></textarea>
                  </div>

                  <button type="submit" className="w-full bg-[#2563eb] hover:bg-blue-600 text-white font-semibold py-3 rounded-xl transition-colors mt-2">
                    💊 Add to Schedule
                  </button>
                </form>
              )}
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="text-xl">📋</span> Active Medication Schedules
            </h2>
            <div className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full font-bold">
              {schedules.filter(s => s.active).length} Active
            </div>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-gray-900/50 border border-gray-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-gray-500">
              <Calendar className="w-12 h-12 mb-4 opacity-50" />
              <p>No active medications scheduled.</p>
            </div>
          ) : (
            <div className="space-y-4 mb-8">
              {schedules.map((schedule) => (
                <div key={schedule.id} className={`bg-gray-900 rounded-2xl border transition-all duration-300 animate-in slide-in-from-right-8 ${schedule.active ? 'border-gray-700 shadow-lg' : 'border-gray-800 opacity-60 grayscale'}`}>
                  <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">

                    <div className="flex items-start gap-4 flex-1">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${schedule.active ? 'bg-blue-500/20 text-blue-400' : 'bg-gray-800 text-gray-500'}`}>
                        <span className="text-2xl">💊</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-bold text-lg text-white">{schedule.medicineName}</h3>
                          <span className="text-gray-400 text-sm font-medium">{schedule.dosage}</span>
                          {schedule.active ? (
                            <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase ml-1">Active</span>
                          ) : (
                            <span className="bg-gray-700 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase ml-1">Paused</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 flex items-center gap-2">
                          <User className="w-3.5 h-3.5" /> {schedule.patientName}
                          <span className="w-1 h-1 bg-gray-700 rounded-full"></span>
                          <Clock className="w-3.5 h-3.5" /> {schedule.times.map(formatAmPm).join(', ')}
                        </p>

                        {schedule.active && (
                          <div className="mt-3 inline-flex items-center gap-1.5 bg-blue-950/50 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-900/50">
                            <Clock className="w-3.5 h-3.5 animate-pulse" /> Next dose: {getNextDoseString(schedule.times)}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <div className="flex gap-1.5 mr-2">
                        {schedule.notifications.pushbullet && <div className="p-1.5 rounded-md bg-gray-800 text-blue-400" title="Pushbullet Enabled"><MessageSquare className="w-4 h-4" /></div>}
                        {schedule.notifications.phone && <div className="p-1.5 rounded-md bg-gray-800 text-green-400" title="Phone Call Enabled"><Phone className="w-4 h-4" /></div>}
                      </div>

                      <button onClick={() => setExpandedCard(expandedCard === schedule.id ? null : schedule.id)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                        {expandedCard === schedule.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>

                      <button onClick={() => toggleScheduleActive(schedule.id)} className={`p-2 rounded-full transition-colors ${schedule.active ? 'bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`} title={schedule.active ? "Pause Schedule" : "Resume Schedule"}>
                        {schedule.active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>

                      <button onClick={() => deleteSchedule(schedule.id)} className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-full transition-colors" title="Delete Schedule">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedCard === schedule.id && (
                    <div className="p-5 pt-0 border-t border-gray-800/50 animate-in slide-in-from-top-2">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">START DATE</p>
                          <p className="text-sm text-gray-300">{schedule.startDate}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-semibold mb-1">DURATION</p>
                          <p className="text-sm text-gray-300">{schedule.duration === 'until_cancelled' ? 'Ongoing' : `${schedule.duration} Days`}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-gray-500 font-semibold mb-1">INSTRUCTIONS</p>
                          <p className="text-sm text-gray-300">{schedule.instructions || 'None'}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating AI Chatbot */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isChatOpen && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl flex flex-col mb-4 shadow-2xl overflow-hidden h-[500px] w-[350px] sm:w-[400px] animate-in slide-in-from-bottom-8">
            <div className="p-4 border-b border-gray-800 bg-gray-900/90 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-600/20 flex items-center justify-center border border-purple-500/30">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Prana AI Assistant</h3>
                  <p className="text-gray-400 text-xs text-green-400 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span> Online</p>
                </div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in duration-300`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-md ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 border border-gray-700 rounded-tl-none'}`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-800 border border-gray-700 text-gray-400 rounded-2xl rounded-tl-none px-4 py-3 flex gap-1 shadow-md">
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce delay-150"></span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 bg-gray-900 border-t border-gray-800">
              <form onSubmit={handleSendMessage} className="relative flex items-center">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Ask about your schedule..."
                  className="w-full bg-gray-800 border border-gray-700 rounded-full pl-5 pr-12 py-3 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors shadow-inner"
                />
                <button 
                  type="submit" 
                  disabled={!chatInput.trim() || isTyping}
                  className="absolute right-2 p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
        
        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-105 ${isChatOpen ? 'bg-gray-800 border border-gray-700 text-white' : 'bg-purple-600 text-white shadow-purple-500/30 border border-purple-500'}`}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-7 h-7" />}
        </button>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
        {toasts.map(toast => (
          <div key={toast.id} className="bg-gray-800 border border-gray-700 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-8 duration-300">
            <div className="text-blue-400">
              {toast.icon}
            </div>
            <p className="text-sm font-medium pr-4">{toast.message}</p>
          </div>
        ))}
      </div>

      {/* CSS for fixing time input appearance in dark mode */}
      <style>{`
        .css-time-input::-webkit-calendar-picker-indicator {
          filter: invert(1);
          opacity: 0.5;
          cursor: pointer;
        }
        .css-time-input::-webkit-calendar-picker-indicator:hover {
          opacity: 0.8;
        }
      `}</style>
    </div>
  );
};

export default Scheduler;
