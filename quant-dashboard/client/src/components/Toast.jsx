import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faExclamationCircle, faInfoCircle, faTimes } from '@fortawesome/free-solid-svg-icons';

const ToastContext = createContext(null);

let toastId = 0;

const TYPE_CONFIG = {
  success: { icon: faCheckCircle, color: '#22c55e', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)' },
  error:   { icon: faExclamationCircle, color: '#ef4444', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)' },
  info:    { icon: faInfoCircle, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)' },
};

function ToastItem({ toast, onDismiss }) {
  const config = TYPE_CONFIG[toast.type] || TYPE_CONFIG.info;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderRadius: 8,
        background: config.bg,
        border: `1px solid ${config.border}`,
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        color: '#e2e8f0',
        fontSize: 13,
        minWidth: 280,
        maxWidth: 420,
        animation: 'modalSlideUp 0.3s cubic-bezier(0.22, 0.61, 0.36, 1)',
        pointerEvents: 'auto',
      }}
    >
      <FontAwesomeIcon icon={config.icon} style={{ color: config.color, fontSize: 16, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: 'none', border: 'none', color: '#64748b', cursor: 'pointer',
          padding: 2, fontSize: 14, flexShrink: 0,
        }}
      >
        <FontAwesomeIcon icon={faTimes} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current[id]) {
      clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const addToast = useCallback((type, message) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    timersRef.current[id] = setTimeout(() => dismiss(id), 3000);
  }, [dismiss]);

  const toast = useRef({
    success: (msg) => addToast('success', msg),
    error: (msg) => addToast('error', msg),
    info: (msg) => addToast('info', msg),
  });

  return (
    <ToastContext.Provider value={toast.current}>
      {children}
      <div
        style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
