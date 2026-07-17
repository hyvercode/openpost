import { useEffect, useRef } from 'react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: ConfirmModalProps) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => confirmBtnRef.current?.focus(), 50);
    }
  }, [isOpen]);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-lg p-5 w-80 shadow-2xl">
        <h3 className="text-[var(--text-primary)] text-sm font-semibold mb-2">{title}</h3>
        <p className="text-[var(--text-secondary)] text-xs mb-5">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="px-3 py-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Cancel
          </button>
          <button 
            ref={confirmBtnRef}
            onClick={onConfirm} 
            className="px-4 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded font-medium transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
