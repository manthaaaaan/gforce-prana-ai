import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

// --- Agent metadata for display ---
const AGENT_META: Record<string, { icon: string; label: string; color: string }> = {
  'predict_risk':          { icon: '🧠', label: 'Risk Prediction Agent',      color: '#a78bfa' },
  'drug_conflict_check':   { icon: '💊', label: 'Drug Conflict Agent',        color: '#f59e0b' },
  'clinical_pipeline':     { icon: '🏥', label: 'Clinical Autonomy Pipeline', color: '#3b82f6' },
  'consultation_analysis': { icon: '🩺', label: 'Consultation Agent',         color: '#10b981' },
  'twilio_alert':          { icon: '📞', label: 'Twilio Alert Agent',         color: '#ef4444' },
  // Generic fallback for any other agent
  'default':               { icon: '⚡', label: 'Agent',                      color: '#6366f1' },
};

// Sub-agents shown during clinical pipeline
const PIPELINE_STAGES = [
  { icon: '📋', label: 'Planner Agent',         color: '#818cf8' },
  { icon: '📊', label: 'Risk Agent',            color: '#f87171' },
  { icon: '🔬', label: 'Research Agent',        color: '#38bdf8' },
  { icon: '👤', label: 'Patient Context Agent', color: '#a3e635' },
  { icon: '💉', label: 'Care Plan Agent',       color: '#fb923c' },
  { icon: '📞', label: 'Notification Agent',    color: '#e879f9' },
  { icon: '🪞', label: 'Reflection Agent',      color: '#2dd4bf' },
];

export interface AgentToast {
  id: string;
  agentName: string;
  icon: string;
  label: string;
  color: string;
  status: 'running' | 'completed' | 'failed';
  timestamp: number;
  subStages?: typeof PIPELINE_STAGES;
  currentSubStage?: number;
}

interface AgentActivityContextType {
  toasts: AgentToast[];
  fireAgentToast: (agentName: string, status?: 'running' | 'completed' | 'failed') => string;
  updateToast: (id: string, status: 'running' | 'completed' | 'failed') => void;
  clearToasts: () => void;
}

const AgentActivityContext = createContext<AgentActivityContextType>({
  toasts: [],
  fireAgentToast: () => '',
  updateToast: () => {},
  clearToasts: () => {},
});

export const useAgentActivity = () => useContext(AgentActivityContext);

export const AgentActivityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<AgentToast[]>([]);
  const toastCounter = useRef(0);

  const fireAgentToast = useCallback((agentName: string, status: 'running' | 'completed' | 'failed' = 'running') => {
    const meta = AGENT_META[agentName] || AGENT_META['default'];
    const id = `agent-toast-${++toastCounter.current}-${Date.now()}`;
    const isPipeline = agentName === 'clinical_pipeline';

    const toast: AgentToast = {
      id,
      agentName,
      icon: meta.icon,
      label: meta.label,
      color: meta.color,
      status,
      timestamp: Date.now(),
      subStages: isPipeline ? PIPELINE_STAGES : undefined,
      currentSubStage: isPipeline ? 0 : undefined,
    };

    setToasts(prev => [...prev, toast]);

    // Auto-advance sub-stages for pipeline
    if (isPipeline && status === 'running') {
      let stage = 0;
      const interval = setInterval(() => {
        stage++;
        if (stage >= PIPELINE_STAGES.length) {
          clearInterval(interval);
          setToasts(prev => prev.map(t => t.id === id ? { ...t, status: 'completed', currentSubStage: PIPELINE_STAGES.length - 1 } : t));
          // Auto-dismiss after completion
          setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
          }, 4000);
          return;
        }
        setToasts(prev => prev.map(t => t.id === id ? { ...t, currentSubStage: stage } : t));
      }, 2500);
    }

    // Auto-dismiss non-pipeline toasts
    if (!isPipeline) {
      setTimeout(() => {
        setToasts(prev => prev.map(t => t.id === id ? { ...t, status: 'completed' } : t));
      }, 3000);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 6000);
    }

    return id;
  }, []);

  const updateToast = useCallback((id: string, status: 'running' | 'completed' | 'failed') => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    if (status === 'completed' || status === 'failed') {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    }
  }, []);

  const clearToasts = useCallback(() => setToasts([]), []);

  return (
    <AgentActivityContext.Provider value={{ toasts, fireAgentToast, updateToast, clearToasts }}>
      {children}
      <AgentToastContainer toasts={toasts} onDismiss={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
    </AgentActivityContext.Provider>
  );
};

// --- Toast Display Component ---
const AgentToastContainer: React.FC<{ toasts: AgentToast[]; onDismiss: (id: string) => void }> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      pointerEvents: 'none',
      maxWidth: '560px',
      width: '90vw',
    }}>
      {toasts.map(toast => (
        <AgentToastCard key={toast.id} toast={toast} onDismiss={() => onDismiss(toast.id)} />
      ))}
    </div>
  );
};

const AgentToastCard: React.FC<{ toast: AgentToast; onDismiss: () => void }> = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const isRunning = toast.status === 'running';
  const isCompleted = toast.status === 'completed';
  const currentStage = toast.subStages && toast.currentSubStage !== undefined ? toast.subStages[toast.currentSubStage] : null;

  return (
    <div
      style={{
        pointerEvents: 'auto',
        background: 'linear-gradient(135deg, rgba(15,15,25,0.97) 0%, rgba(25,20,40,0.97) 100%)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${toast.color}40`,
        borderRadius: '16px',
        padding: '16px 20px',
        boxShadow: `0 0 30px ${toast.color}20, 0 8px 32px rgba(0,0,0,0.5)`,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
        opacity: visible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative' as const,
      }}
      onClick={onDismiss}
    >
      {/* Animated top border glow */}
      {isRunning && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${toast.color}, transparent)`,
          animation: 'agentGlowSlide 2s ease-in-out infinite',
        }} />
      )}

      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Icon with pulse */}
        <div style={{
          fontSize: '24px',
          width: '40px',
          height: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
          background: `${toast.color}15`,
          border: `1px solid ${toast.color}30`,
          flexShrink: 0,
          animation: isRunning ? 'agentPulse 2s ease-in-out infinite' : 'none',
        }}>
          {currentStage ? currentStage.icon : toast.icon}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '2px',
          }}>
            <span style={{
              color: '#fff',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '0.3px',
            }}>
              {currentStage ? currentStage.label : toast.label}
            </span>
            {/* Status badge */}
            <span style={{
              fontSize: '10px',
              fontWeight: 800,
              textTransform: 'uppercase' as const,
              letterSpacing: '1px',
              padding: '2px 8px',
              borderRadius: '6px',
              background: isRunning ? `${toast.color}25` : isCompleted ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)',
              color: isRunning ? toast.color : isCompleted ? '#22c55e' : '#ef4444',
              border: `1px solid ${isRunning ? `${toast.color}40` : isCompleted ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
            }}>
              {isRunning ? 'Running' : isCompleted ? '✓ Done' : '✗ Failed'}
            </span>
          </div>
          <div style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '11px',
            fontFamily: 'monospace',
          }}>
            {toast.agentName}
            {toast.subStages && ` • stage ${(toast.currentSubStage || 0) + 1}/${toast.subStages.length}`}
          </div>
        </div>

        {/* Spinner or check */}
        <div style={{ flexShrink: 0, width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isRunning ? (
            <div style={{
              width: '20px',
              height: '20px',
              border: `2px solid ${toast.color}30`,
              borderTopColor: toast.color,
              borderRadius: '50%',
              animation: 'agentSpin 0.8s linear infinite',
            }} />
          ) : isCompleted ? (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#22c55e" strokeWidth="2" />
              <path d="M6 10l3 3 5-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#ef4444" strokeWidth="2" />
              <path d="M7 7l6 6M13 7l-6 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </svg>
          )}
        </div>
      </div>

      {/* Pipeline progress bar */}
      {toast.subStages && (
        <div style={{ marginTop: '12px', display: 'flex', gap: '3px' }}>
          {toast.subStages.map((stage, i) => (
            <div key={i} style={{
              flex: 1,
              height: '3px',
              borderRadius: '2px',
              background: i <= (toast.currentSubStage || 0)
                ? `linear-gradient(90deg, ${stage.color}, ${stage.color}aa)`
                : 'rgba(255,255,255,0.08)',
              transition: 'background 0.5s ease',
              boxShadow: i === toast.currentSubStage ? `0 0 8px ${stage.color}60` : 'none',
            }} />
          ))}
        </div>
      )}
    </div>
  );
};

// --- CSS Keyframes (injected once) ---
const styleId = 'agent-activity-toast-styles';
if (typeof document !== 'undefined' && !document.getElementById(styleId)) {
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes agentSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes agentPulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    @keyframes agentGlowSlide {
      0% { transform: translateX(-100%); }
      100% { transform: translateX(100%); }
    }
  `;
  document.head.appendChild(style);
}

export default AgentActivityProvider;
