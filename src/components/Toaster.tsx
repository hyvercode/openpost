import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';
import { cn } from '../utils';

export function Toaster() {
  const { toasts, removeToast } = useStore();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className={cn(
              "pointer-events-auto min-w-[300px] max-w-[400px] bg-[var(--bg-panel)] border rounded p-4 shadow-[var(--shadow-subtle)] flex items-start gap-3",
              toast.type === 'success' && "border-[var(--success)]/20 bg-[var(--success)]/5",
              toast.type === 'error' && "border-[var(--danger)]/20 bg-[var(--danger)]/5",
              toast.type === 'warning' && "border-[var(--warning)]/20 bg-[var(--warning)]/5",
              toast.type === 'info' && "border-[var(--primary)]/20 bg-[var(--primary)]/5"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-[var(--success)]" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-[var(--danger)]" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-[var(--warning)]" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[var(--primary)]" />}
            </div>
            
            <div className="flex-1 flex flex-col gap-1.5">
              {toast.title && (
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {toast.title}
                </p>
              )}
              <p className="text-sm font-medium text-[var(--text-secondary)]">
                {toast.message}
              </p>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action?.onClick();
                    removeToast(toast.id);
                  }}
                  className="mt-1 w-fit text-xs font-semibold px-3 py-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors text-[var(--text-primary)] cursor-pointer"
                >
                  {toast.action.label}
                </button>
              )}
            </div>

            <button
              onClick={() => {
                if (toast.onDismiss) toast.onDismiss();
                removeToast(toast.id);
              }}
              className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Progress bar for auto-dismiss */}
            {toast.duration !== undefined && toast.duration > 0 && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-b-xl",
                  toast.type === 'success' && "bg-[var(--success)]",
                  toast.type === 'error' && "bg-[var(--danger)]",
                  toast.type === 'warning' && "bg-[var(--warning)]",
                  toast.type === 'info' && "bg-[var(--primary)]"
                )}
              />
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
