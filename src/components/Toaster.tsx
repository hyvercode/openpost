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
              "pointer-events-auto min-w-[300px] max-w-[400px] bg-[var(--bg-panel)] border rounded-xl p-4 shadow-2xl flex items-start gap-3",
              toast.type === 'success' && "border-green-500/20 bg-green-500/5",
              toast.type === 'error' && "border-red-500/20 bg-red-500/5",
              toast.type === 'warning' && "border-yellow-500/20 bg-yellow-500/5",
              toast.type === 'info' && "border-[var(--primary)]/20 bg-[var(--primary)]/5"
            )}
          >
            <div className="shrink-0 mt-0.5">
              {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
              {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
              {toast.type === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              {toast.type === 'info' && <Info className="w-5 h-5 text-[var(--primary)]" />}
            </div>
            
            <div className="flex-1">
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {toast.message}
              </p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="shrink-0 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors p-1 rounded-lg hover:bg-[var(--bg-hover)]"
            >
              <X className="w-4 h-4" />
            </button>
            
            {/* Progress bar for auto-dismiss */}
            {toast.duration && (
              <motion.div
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: toast.duration / 1000, ease: 'linear' }}
                className={cn(
                  "absolute bottom-0 left-0 right-0 h-0.5 origin-left rounded-b-xl",
                  toast.type === 'success' && "bg-green-500",
                  toast.type === 'error' && "bg-red-500",
                  toast.type === 'warning' && "bg-yellow-500",
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
