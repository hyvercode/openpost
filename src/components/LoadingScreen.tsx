import React from 'react';
import { motion } from 'motion/react';
import { MonitorSmartphone, Sun, Moon } from 'lucide-react';
import { useStore } from '../store/useStore';
import { cn } from '../utils';

export function LoadingScreen({ message = 'Loading OpenPost...' }: { message?: string }) {
  const { theme } = useStore();

  return (
    <div className={cn(
      "min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] flex flex-col items-center justify-center p-4 transition-colors duration-500",
      theme === 'light' ? 'theme-light' : theme === 'dark' ? 'theme-dark' : 'theme-default'
    )}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="flex flex-col items-center"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: 'easeInOut' 
            }}
            className="absolute inset-0 bg-[var(--primary)]/20 blur-3xl rounded-full"
          />
          <div className="relative bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-strong)] shadow-2xl">
            <MonitorSmartphone className="w-16 h-16 text-[var(--primary)]" />
          </div>
          
          {/* Spinner rings */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-4 border-2 border-transparent border-t-[var(--primary)]/30 rounded-full"
          />
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="absolute -inset-2 border-2 border-transparent border-t-[var(--primary)]/50 rounded-full"
          />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl font-extrabold tracking-tighter text-[var(--text-primary)] mb-2"
        >
          OpenPost
        </motion.h1>
        
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="flex items-center gap-1.5 h-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scaleY: [1, 2.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: 'easeInOut',
                }}
                className="w-1 bg-[var(--primary)] rounded-full"
              />
            ))}
          </div>
          <p className="text-xs font-medium text-[var(--text-secondary)] uppercase tracking-widest animate-pulse">
            {message}
          </p>
        </motion.div>
      </motion.div>
      
      {/* Background patterns */}
      <div className="fixed inset-0 pointer-events-none opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--primary),transparent_70%)] opacity-[0.03]" />
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-soft-light" />
      </div>
    </div>
  );
}
