import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Activity, Bot, BrainCircuit, CheckCircle2, Clock, Database, GitBranch, Radio, RefreshCw, Search, ShieldAlert, Webhook, Wrench } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAgentActivity } from '../AgentActivityToast';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type WorkflowEvent = {
  id: string;
  agent: string;
  kind: string;
  status: string;
  summary: string;
  payload: any;
  created_at: number;
};

type ToolCall = {
  id: string;
  agent: string;
  tool_name: string;
  status: string;
  input: any;
  output: any;
};

type WorkflowDetail = {
  task: {
    id: string;
    status: string;
    result?: any;
  };
  events: WorkflowEvent[];
  tool_calls: ToolCall[];
};

const demoWebhook = {
  source: 'smartwatch_gateway',
  type: 'vitals.changed',
  patient: {
    id: 'demo-patient',
    name: 'Manthan G',
    age: 58,
    conditions: ['chronic heart failure', 'hypertension'],
    medications: ['Amlodipine', 'Aspirin'],
    contacts: [{ role: 'doctor', name: 'Dr. Ramesh Kumar', channel: 'dashboard' }]
  },
  vitals: {
    age: 58,
    anaemia: 1,
    creatinine_phosphokinase: 560,
    diabetes: 0,
    ejection_fraction: 24,
    high_blood_pressure: 1,
    platelets: 180000,
    serum_creatinine: 2.0,
    serum_sodium: 128,
    sex: 1,
    smoking: 0,
    time: 35
  }
};

const agentIcon: Record<string, React.ReactNode> = {
  planner: <GitBranch className="w-4 h-4" />,
  risk_agent: <ShieldAlert className="w-4 h-4" />,
  web_research_agent: <Search className="w-4 h-4" />,
  patient_context_agent: <Database className="w-4 h-4" />,
  care_plan_agent: <Bot className="w-4 h-4" />,
  notification_agent: <Radio className="w-4 h-4" />,
  reflection_agent: <CheckCircle2 className="w-4 h-4" />
};

const AutonomousPipeline: React.FC = () => {
  const navigate = useNavigate();
  const { fireAgentToast } = useAgentActivity();
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [detail, setDetail] = useState<WorkflowDetail | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState('');

  const status = detail?.task.status || (workflowId ? 'queued' : 'idle');
  const completed = status === 'completed' || status === 'failed';

  const groupedEvents = useMemo(() => {
    const seen = new Map<string, WorkflowEvent>();
    detail?.events.forEach((event) => seen.set(event.agent, event));
    return Array.from(seen.values());
  }, [detail]);

  useEffect(() => {
    if (!workflowId || completed) return;
    const timer = window.setInterval(() => fetchWorkflow(workflowId), 1200);
    fetchWorkflow(workflowId);
    return () => window.clearInterval(timer);
  }, [workflowId, completed]);

  async function startManual() {
    setIsStarting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/clinical/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoWebhook)
      });
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setDetail(null);
      // Fire agent activity toast for hackathon demo
      fireAgentToast('clinical_pipeline');
    } catch (err) {
      setError('Could not start workflow. Make sure the FastAPI backend is running on port 8000.');
    } finally {
      setIsStarting(false);
    }
  }

  async function fireWebhook() {
    setIsStarting(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/clinical/webhook/vitals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(demoWebhook)
      });
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      setDetail(null);
      // Fire agent activity toast for hackathon demo
      fireAgentToast('clinical_pipeline');
    } catch (err) {
      setError('Webhook failed. Make sure the backend is running.');
    } finally {
      setIsStarting(false);
    }
  }

  async function fetchWorkflow(id: string) {
    const res = await fetch(`${API_BASE}/clinical/workflows/${id}`);
    if (!res.ok) return;
    const data = await res.json();
    setDetail(data);
  }

  const carePlan = detail?.task.result?.care_plan;
  const reflection = detail?.task.result?.reflection;
  const plannerReasoning = detail?.task.result?.plan?.reasoning;
  const researchGuidance = detail?.task.result?.research?.clinical_guidance;

  return (
    <div className="relative min-h-screen w-full bg-transparent text-gray-100 font-manrope animate-page-transition">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm -z-10" />

      <header className="sticky top-0 z-40 glass-panel border-b border-white/10 px-6 py-4 stagger-1">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/')} className="p-2 -ml-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <Bot className="w-5 h-5 text-blue-400" />
                Autonomous Clinical Pipeline
              </h1>
              <p className="text-sm text-gray-400 mt-1">Planner-led multi-agent monitoring, research, triage, and notification workflow.</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button onClick={startManual} disabled={isStarting} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-semibold text-sm">
              <Activity className="w-4 h-4" />
              Start Autonomous Run
            </button>
            <button onClick={fireWebhook} disabled={isStarting} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-100 border border-gray-700 px-4 py-2 rounded-lg font-semibold text-sm">
              <Webhook className="w-4 h-4" />
              Fire Vitals Webhook
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 stagger-2">
        <section className="lg:col-span-4 glass-card rounded-[24px] p-6 stagger-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-bold text-white">Workflow State</h2>
            <span className={`text-xs uppercase font-bold px-3 py-1 rounded-full border ${status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
              {status}
            </span>
          </div>

          {!workflowId ? (
            <div className="text-gray-400 text-sm leading-relaxed">
              Launch a demo run to watch PRANA receive a vitals event, plan the work, fan out specialist agents, call tools, search live context, and return a care packet without human steering.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                <div className="text-xs text-gray-500 uppercase font-bold mb-1">Workflow ID</div>
                <div className="font-mono text-xs text-gray-300 break-all">{workflowId}</div>
              </div>
              <div className="space-y-3">
                {groupedEvents.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${event.status === 'completed' ? 'bg-green-500/10 text-green-400 border-green-500/30' : 'bg-blue-500/10 text-blue-400 border-blue-500/30'}`}>
                      {agentIcon[event.agent] || <Bot className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{event.agent.replaceAll('_', ' ')}</div>
                      <div className="text-xs text-gray-400">{event.summary}</div>
                    </div>
                  </div>
                ))}
                {!detail && (
                  <div className="flex items-center gap-2 text-sm text-blue-300">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Waiting for worker...
                  </div>
                )}
              </div>
            </div>
          )}
          {error && <div className="mt-4 text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3">{error}</div>}
        </section>

        <section className="lg:col-span-8 flex flex-col gap-6 stagger-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card rounded-[20px] p-5">
              <Clock className="w-5 h-5 text-blue-400 mb-3" />
              <div className="text-2xl font-bold text-white">{detail?.events.length || 0}</div>
              <div className="text-sm text-gray-400">Persisted agent events</div>
            </div>
            <div className="glass-card rounded-[20px] p-5">
              <Wrench className="w-5 h-5 text-purple-400 mb-3" />
              <div className="text-2xl font-bold text-white">{detail?.tool_calls.length || 0}</div>
              <div className="text-sm text-gray-400">Tool calls recorded</div>
            </div>
            <div className="glass-card rounded-[20px] p-5">
              <ShieldAlert className="w-5 h-5 text-red-400 mb-3" />
              <div className="text-2xl font-bold text-white">{detail?.task.result?.risk?.risk_score ?? '--'}</div>
              <div className="text-sm text-gray-400">Autonomous risk score</div>
            </div>
          </div>

          {plannerReasoning && (
            <div className="bg-blue-600/10 border border-blue-500/30 rounded-2xl p-6">
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <BrainCircuit className="w-4 h-4" /> Planner Deep Reasoning
              </h2>
              <p className="text-gray-200 text-sm italic">"{plannerReasoning}"</p>
            </div>
          )}

          {carePlan ? (
            <div className="glass-card rounded-[24px] p-6 stagger-5">
              <div className="flex items-start justify-between gap-4 mb-5">
                <div>
                  <h2 className="text-xl font-bold text-white">Final Care Packet</h2>
                  <p className="text-gray-400 text-sm mt-1">{carePlan.summary}</p>
                </div>
                <span className="text-xs uppercase font-bold bg-red-500/10 text-red-300 border border-red-500/30 px-3 py-1 rounded-full">
                  {carePlan.triage}
                </span>
              </div>
              <div className="space-y-3 mb-5">
                {carePlan.actions.map((action: string, index: number) => (
                  <div key={index} className="flex gap-3 text-sm text-gray-200 bg-gray-950/70 border border-gray-800 rounded-xl p-3">
                    <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                    {action}
                  </div>
                ))}
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-sm text-blue-100">
                {carePlan.patient_message}
              </div>
              {reflection && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-400 font-mono">trace_hash: {reflection.trace_hash}</div>
                  <div className={`text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1 ${reflection.safety_check === 'passed' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                    {reflection.safety_check === 'passed' ? <CheckCircle2 className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                    Safety: {reflection.safety_check || 'checked'}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel border-dashed rounded-[24px] p-10 text-center text-gray-400 stagger-5">
              The final care packet will appear here after the autonomous agents finish.
            </div>
          )}

          <div className="glass-card rounded-[24px] p-6 stagger-5">
            <h2 className="font-bold text-white mb-4">Autonomous Tool Insights</h2>
            <div className="space-y-4">
              {researchGuidance && (
                <div className="bg-purple-600/10 border border-purple-500/30 rounded-xl p-4">
                  <div className="text-xs font-bold text-purple-400 uppercase mb-2 flex items-center gap-2">
                    <Search className="w-3 h-3" /> Research-Driven Guidance
                  </div>
                  <div className="text-sm text-gray-200 leading-relaxed">{researchGuidance}</div>
                </div>
              )}
              {detail?.tool_calls.map((call) => (
                <div key={call.id} className="bg-gray-950 border border-gray-800 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-sm font-semibold text-white">{call.tool_name}</div>
                    <div className="text-xs text-gray-400">{call.agent}</div>
                  </div>
                  <pre className="text-xs text-gray-400 overflow-auto max-h-28">{JSON.stringify(call.output, null, 2)}</pre>
                </div>
              ))}
              {(!detail || detail.tool_calls.length === 0) && <div className="text-sm text-gray-500">No tool calls recorded yet.</div>}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AutonomousPipeline;
