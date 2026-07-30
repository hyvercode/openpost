import React from 'react';
import { X, Monitor, MonitorSmartphone, Apple, Download, Terminal } from 'lucide-react';
import { cn } from '../utils';
import { useStore } from '../store/useStore';

interface AgentDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentDownloadModal({ isOpen, onClose }: AgentDownloadModalProps) {
  const { setAgentMode, addToast } = useStore();

  if (!isOpen) return null;

  const handleDownload = (os: string) => {
    const url = `/downloads/desktop-agent-${os}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `desktop-agent-${os === 'win' ? 'win.exe' : os}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    addToast(`Downloading Desktop Agent for ${os.toUpperCase()}...`, 'success', 3000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        className="bg-[var(--bg-base)] border border-[var(--border-strong)] rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-hover)]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
              <MonitorSmartphone className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Desktop Agent Bridge</h2>
              <p className="text-xs text-[var(--text-secondary)]">Connect to localhost and private networks</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-hover-strong)] text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="p-4 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] space-y-2">
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">Why use the Desktop Agent?</h3>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
              For security reasons (SSRF Protection), the Cloud Agent cannot make requests to <code>localhost</code>, <code>127.0.0.1</code>, or private IP addresses. By running the lightweight Desktop Agent Bridge on your machine, you can safely proxy API requests from this web interface directly to your local development servers.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Download Agent Binary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => handleDownload('win.exe')}
                className="flex flex-col items-center justify-center p-4 gap-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bg-hover-strong)] group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Monitor className="w-6 h-6 text-[var(--text-primary)] group-hover:text-[var(--primary)]" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">Windows</span>
                  <span className="text-xs text-[var(--text-secondary)]">64-bit (.exe)</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-[var(--primary)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="w-3 h-3" /> Download
                </div>
              </button>

              <button
                onClick={() => handleDownload('macos')}
                className="flex flex-col items-center justify-center p-4 gap-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bg-hover-strong)] group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Apple className="w-6 h-6 text-[var(--text-primary)] group-hover:text-[var(--primary)]" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">macOS</span>
                  <span className="text-xs text-[var(--text-secondary)]">Apple Silicon / Intel</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-[var(--primary)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="w-3 h-3" /> Download
                </div>
              </button>

              <button
                onClick={() => handleDownload('linux')}
                className="flex flex-col items-center justify-center p-4 gap-3 rounded-xl border border-[var(--border-subtle)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-all group"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-[var(--bg-hover-strong)] group-hover:bg-[var(--primary)]/20 transition-colors">
                  <Terminal className="w-6 h-6 text-[var(--text-primary)] group-hover:text-[var(--primary)]" />
                </div>
                <div className="text-center">
                  <span className="block text-sm font-semibold text-[var(--text-primary)]">Linux</span>
                  <span className="text-xs text-[var(--text-secondary)]">x64 Binary</span>
                </div>
                <div className="mt-2 text-xs font-semibold text-[var(--primary)] flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Download className="w-3 h-3" /> Download
                </div>
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">How to use</h3>
            <div className="space-y-2 text-sm text-[var(--text-secondary)]">
              <p className="flex items-start gap-2">
                <span className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-subtle)] mt-0.5">1</span>
                Download the executable for your operating system.
              </p>
              <p className="flex items-start gap-2">
                <span className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-subtle)] mt-0.5">2</span>
                <span>Run the downloaded file from your terminal. <br/><span className="text-xs opacity-70">(On Linux/macOS, you may need to run <code className="font-mono">chmod +x</code> first)</span></span>
              </p>
              <p className="flex items-start gap-2">
                <span className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-subtle)] mt-0.5">3</span>
                The agent will start on port <code className="font-mono text-[var(--text-primary)]">8765</code>.
              </p>
              <p className="flex items-start gap-2">
                <span className="font-mono bg-[var(--bg-hover)] px-1.5 py-0.5 rounded text-[10px] border border-[var(--border-subtle)] mt-0.5">4</span>
                Click the button below (or in the header) to switch this app to Desktop mode.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-hover)]/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover-strong)] transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={() => {
              setAgentMode('desktop');
              addToast('Switched to Desktop Agent', 'success', 2000);
              onClose();
            }}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary)]/90 shadow-sm transition-all flex items-center gap-2"
          >
            <MonitorSmartphone className="w-4 h-4" />
            Switch to Desktop Agent
          </button>
        </div>
      </div>
    </div>
  );
}
