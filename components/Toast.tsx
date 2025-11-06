'use client';

import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type, onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle size={16} style={{ color: '#28a745' }} />,
    error: <AlertCircle size={16} style={{ color: '#dc3545' }} />,
    info: <Info size={16} style={{ color: '#007aff' }} />
  };

  return (
    <div
      className="fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-slide-in-right z-50"
      style={{
        backgroundColor: 'var(--background)',
        borderColor: 'var(--border)',
        maxWidth: '400px'
      }}
    >
      {icons[type]}
      <span className="flex-1 text-sm" style={{ color: 'var(--text)' }}>
        {message}
      </span>
      <button
        onClick={onClose}
        className="flex items-center justify-center w-5 h-5 rounded hover:bg-black/10 transition-colors"
      >
        <X size={14} style={{ color: 'var(--text)', opacity: 0.6 }} />
      </button>
    </div>
  );
}
