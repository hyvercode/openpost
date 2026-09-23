import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Monitor, 
  Terminal, 
  Check, 
  Copy, 
  ExternalLink, 
  Cpu, 
  ShieldCheck, 
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { useStore } from '../store/useStore';

interface DesktopDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  detectedOS?: 'windows' | 'mac' | 'linux';
}

export const DesktopDownloadModal: React.FC<DesktopDownloadModalProps> = ({ 
  isOpen, 
  onClose,
  detectedOS = 'windows' 
}) => {
  const { addToast } = useStore();
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac' | 'linux'>(detectedOS);
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCmd(id);
    addToast('Command copied to clipboard!', 'success', 2500);
    setTimeout(() => setCopiedCmd(null), 2000);
  };

  const handleDownload = (filename: string, platformName: string) => {
    // Generate a downloadable text receipt / instructions or trigger direct release asset
    const blob = new Blob([
      `OpenPost Desktop v1.0.0 - ${platformName}\n\n` +
      `Thank you for downloading OpenPost Desktop!\n` +
      `Package: ${filename}\n` +
      `Documentation: https://github.com/hyvercode/openpost\n\n` +
      `Installation Instructions:\n` +
      `1. Run the installer (${filename})\n` +
      `2. OpenPost includes an embedded offline server and SQLite engine.\n` +
      `3. Enjoy zero-latency API testing!\n`
    ], { type: 'text/plain' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(`Starting download: ${filename} (${platformName})`, 'success', 4000);
  };

  const platforms = [
    {
      id: 'windows' as const,
      name: 'Windows',
      badge: 'Windows 10 / 11 (64-bit)',
      filename: 'OpenPost-Setup-1.0.0.exe',
      size: '84.2 MB',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.901-1.799"/>
        </svg>
      ),
      description: 'Installer with automatic updates and desktop shortcuts.',
      installGuide: 'Double click OpenPost-Setup-1.0.0.exe and follow the prompt.',
    },
    {
      id: 'mac' as const,
      name: 'macOS',
      badge: 'Apple Silicon (M1/M2/M3) & Intel',
      filename: 'OpenPost-1.0.0.dmg',
      size: '89.6 MB',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.42c.62-.75 1.04-1.8 0.93-2.85-.9.04-1.98.6-2.61 1.34-.56.64-1.05 1.71-.92 2.74 1.01.08 2.03-.5 2.6-1.23z"/>
        </svg>
      ),
      description: 'Universal macOS disk image (.dmg). Drag into Applications folder.',
      installGuide: 'Open .dmg and drag OpenPost into your Applications folder.',
    },
    {
      id: 'linux' as const,
      name: 'Linux',
      badge: 'Ubuntu / Debian / Fedora / Arch',
      filename: 'OpenPost-1.0.0.AppImage',
      size: '81.4 MB',
      icon: (
        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
          <path d="M12.002 0c-4.148 0-7.5 3.352-7.5 7.5 0 2.827 1.554 5.289 3.847 6.545l-.469 1.637c-.161.562.157 1.152.719 1.313.193.055.39.047.579-.016l1.834-.611c.328.086.666.132 1.012.132.346 0 .684-.046 1.012-.132l1.834.611c.189.063.386.071.579.016.562-.161.88-.751.719-1.313l-.469-1.637c2.293-1.256 3.847-3.718 3.847-6.545 0-4.148-3.352-7.5-7.5-7.5z"/>
        </svg>
      ),
      description: 'Standalone AppImage and Debian package for Linux distros.',
      installGuide: 'chmod +x OpenPost-1.0.0.AppImage && ./OpenPost-1.0.0.AppImage',
    },
  ];

  const currentPlatform = platforms.find(p => p.id === selectedOS) || platforms[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl bg-[#1F0015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-[#2C001E]">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#E95420] flex items-center justify-center text-white shadow-lg shadow-[#E95420]/25">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight">Download OpenPost Desktop</h2>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#E95420] bg-[#E95420]/15 px-2 py-0.5 rounded-md border border-[#E95420]/30">
                  v1.0.0
                </span>
              </div>
              <p className="text-xs text-white/50">Native, offline-first client with embedded backend & local database</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* OS Switcher Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {platforms.map(p => {
              const isSelected = selectedOS === p.id;
              const isDetected = detectedOS === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedOS(p.id)}
                  className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col gap-1.5 cursor-pointer ${
                    isSelected 
                      ? 'bg-[#3D0C2A] border-[#E95420] ring-1 ring-[#E95420]/50' 
                      : 'bg-[#16000F] border-white/5 hover:border-white/20 text-white/70 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={isSelected ? 'text-[#E95420]' : 'text-white/60'}>
                      {p.icon}
                    </span>
                    {isDetected && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Detected
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-bold text-white mt-1">{p.name}</div>
                  <div className="text-[10px] text-white/40 truncate">{p.badge}</div>
                </button>
              );
            })}
          </div>

          {/* Active Platform Download Card */}
          <div className="p-5 rounded-xl bg-[#2C001E] border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span>{currentPlatform.filename}</span>
                  <span className="text-xs font-normal text-white/40">({currentPlatform.size})</span>
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {currentPlatform.description}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDownload(currentPlatform.filename, currentPlatform.name)}
                className="h-11 px-5 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#E95420]/25 active:scale-95 shrink-0 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download for {currentPlatform.name}</span>
              </button>
            </div>

            {/* Quick Install Guide */}
            <div className="p-3 rounded-lg bg-[#16000F] border border-white/5 flex items-center justify-between text-xs font-mono text-white/70">
              <span className="truncate mr-2">
                <span className="text-white/40 select-none">$ </span>
                {currentPlatform.installGuide}
              </span>
              <button
                onClick={() => handleCopy(currentPlatform.installGuide, 'guide')}
                className="text-white/40 hover:text-white p-1 rounded transition-colors shrink-0"
                title="Copy installation instruction"
              >
                {copiedCmd === 'guide' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Build from Source & Desktop Agent Option */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#16000F] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Terminal className="w-4 h-4 text-[#E95420]" />
                <span>Build Desktop Binary Locally</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Build the native Electron binary directly with embedded SQLite and server:
              </p>
              <div className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-white/80 flex items-center justify-between">
                <code>npm run build:electron</code>
                <button
                  onClick={() => handleCopy('npm run build:electron', 'build')}
                  className="text-white/40 hover:text-white p-0.5"
                >
                  {copiedCmd === 'build' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#16000F] border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Local Desktop Agent (Port 8765)</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Test localhost and bypass browser CORS directly from the web client:
              </p>
              <div className="p-2 rounded bg-black/40 border border-white/5 font-mono text-[10px] text-white/80 flex items-center justify-between">
                <code>npm run bridge</code>
                <button
                  onClick={() => handleCopy('npm run bridge', 'agent')}
                  className="text-white/40 hover:text-white p-0.5"
                >
                  {copiedCmd === 'agent' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#16000F] border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Free &amp; Open Source · No Cloud Lock-In</span>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
