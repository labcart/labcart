'use client';

import { useEffect, useRef } from 'react';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)' }}
      onClick={onCancel}
    >
      <div
        ref={dialogRef}
        className="rounded-lg shadow-xl border animate-scale-in"
        style={{
          backgroundColor: 'var(--background)',
          borderColor: 'var(--border)',
          width: '400px',
          maxWidth: '90vw'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-base font-semibold" style={{ color: 'var(--text)' }}>
            {title}
          </h3>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          <p className="text-sm" style={{ color: 'var(--text)', opacity: 0.8 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              color: 'var(--text)',
              backgroundColor: 'transparent',
              border: '1px solid var(--border)'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(0, 0, 0, 0.05)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm font-medium transition-colors"
            style={{
              color: '#ffffff',
              backgroundColor: danger ? '#dc3545' : '#007aff',
              border: 'none'
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.opacity = '1';
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
