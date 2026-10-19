import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  ShieldCheck, 
  Copy,
  ExternalLink,
  KeyRound,
  FlaskConical,
  Sparkles,
  Info
} from 'lucide-react';
import { api } from '../lib/api';
import { useStore } from '../store/useStore';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'login' | 'register';
}

declare global {
  interface Window {
    google?: any;
  }
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({ isOpen, onClose, mode }) => {
  const { setUser, addToast } = useStore();
  const googleBtnRef = useRef<HTMLDivElement>(null);

  // Client ID state
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('openpost_google_client_id') || '');
  const activeClientId = customClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';
  const isConfigured = Boolean(activeClientId && activeClientId.trim().length > 10);

  // Tabs: 'oauth' (Official GIS), 'sandbox' (Test Mock), 'config' (Settings)
  const [activeTab, setActiveTab] = useState<'oauth' | 'sandbox' | 'config'>(() => isConfigured ? 'oauth' : 'config');

  // Sandbox state
  const [sandboxEmail, setSandboxEmail] = useState('');
  const [sandboxName, setSandboxName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedOrigin, setCopiedOrigin] = useState(false);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  // Initialize GIS if clientId exists
  useEffect(() => {
    if (!isOpen) return;

    if (isConfigured && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: activeClientId.trim(),
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Render official Google button into DOM
        if (googleBtnRef.current) {
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'filled_blue',
            size: 'large',
            width: 320,
            text: mode === 'register' ? 'signup_with' : 'signin_with',
            shape: 'rectangular',
          });
        }

        // Trigger Google One Tap prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed()) {
            console.log('Google One Tap not displayed:', notification.getNotDisplayedReason());
          }
        });
      } catch (err) {
        console.warn('Google Identity Services initialization error:', err);
      }
    }
  }, [isOpen, activeClientId, isConfigured, mode, activeTab]);

  const handleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/google', {
        credential: response.credential,
      });

      const { user, token, message } = res.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      addToast(message || `Berhasil masuk sebagai ${user.displayName || user.email}!`, 'success', 3500);
      onClose();
    } catch (err: any) {
      console.error('Google token exchange error:', err);
      setError(err.response?.data?.error || 'Gagal memverifikasi token Google OAuth dengan server.');
    } finally {
      setLoading(false);
    }
  };

  const handleSandboxAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sandboxEmail) {
      setError('Masukkan alamat email untuk simulasi.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/google', {
        email: sandboxEmail.trim().toLowerCase(),
        displayName: sandboxName.trim() || sandboxEmail.split('@')[0],
      });

      const { user, token, message } = res.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      addToast(message || `[Mode Sandbox] Masuk sebagai ${user.displayName || user.email}`, 'info', 3500);
      onClose();
    } catch (err: any) {
      console.error('Sandbox Auth error:', err);
      setError(err.response?.data?.error || err.message || 'Gagal login dalam mode sandbox.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = customClientId.trim();
    if (cleanId) {
      localStorage.setItem('openpost_google_client_id', cleanId);
      addToast('Google Client ID tersimpan! Menginisialisasi Google Sign-In...', 'success');
      setActiveTab('oauth');
    } else {
      localStorage.removeItem('openpost_google_client_id');
      addToast('Google Client ID dihapus.', 'info');
      setActiveTab('config');
    }
  };

  const handleCopyOrigin = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(currentOrigin);
      setCopiedOrigin(true);
      addToast('Origin aplikasi disalin ke clipboard!', 'info', 2000);
      setTimeout(() => setCopiedOrigin(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md bg-[#1F0015] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-white"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-[#2C001E]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-md">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight">
                {mode === 'register' ? 'Daftar dengan Google' : 'Masuk dengan Google'}
              </h2>
              <div className="flex items-center gap-1.5 text-[11px]">
                {isConfigured ? (
                  <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Google Identity Services Aktif
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1 font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    OAuth Client ID Belum Dikonfigurasi
                  </span>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-[#16000F] text-xs font-semibold">
          <button
            onClick={() => setActiveTab('oauth')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'oauth'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Google Sign-In Resmi</span>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'config'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Konfigurasi Client ID</span>
          </button>
          <button
            onClick={() => setActiveTab('sandbox')}
            className={`py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'sandbox'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
            title="Mode Sandbox / Pengujian"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sandbox</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Official Google OAuth */}
          {activeTab === 'oauth' && (
            <div className="space-y-4">
              {isConfigured ? (
                <div className="flex flex-col items-center justify-center py-4 space-y-4">
                  <p className="text-xs text-white/70 text-center max-w-xs">
                    Klik tombol di bawah untuk autentikasi resmi menggunakan akun Google Anda via Google Identity Services:
                  </p>

                  {/* Official Google Button Render Target */}
                  <div 
                    ref={googleBtnRef} 
                    className="min-h-[44px] flex items-center justify-center"
                  />

                  {loading && (
                    <div className="flex items-center gap-2 text-xs text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memverifikasi kredensial Google...</span>
                    </div>
                  )}

                  <div className="pt-2 text-[11px] text-white/40 text-center flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Token diverifikasi langsung dengan Google TokenInfo API</span>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
                  <div className="flex items-start gap-2.5 text-amber-400">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <div className="text-xs leading-relaxed">
                      <strong className="block font-bold mb-1">Google OAuth Client ID Belum Terpasang</strong>
                      Untuk memunculkan popup/tombol resmi Google Sign-In, aplikasi membutuhkan OAuth 2.0 Web Client ID yang terdaftar di Google Cloud Console.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('config')}
                    className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Pasang Google Client ID Sekarang</span>
                  </button>
                  <p className="text-[10px] text-white/50 text-center">
                    Atau gunakan tab <strong>Sandbox</strong> untuk pengujian instan tanpa setup.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Setup / Configuration */}
          {activeTab === 'config' && (
            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div className="text-xs text-white/70 leading-relaxed">
                Agar Google Sign-In berfungsi resmi dan tidak dummy, Anda perlu memasukkan <strong>OAuth 2.0 Web Client ID</strong> dari Google Cloud Console.
              </div>

              {/* Step 1: Copy Origin */}
              <div className="p-3 bg-[#2C001E] border border-white/10 rounded-xl space-y-2">
                <div className="text-[11px] font-semibold text-white/80">
                  Langkah 1: Tambahkan domain ke <em>Authorized JavaScript Origins</em>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentOrigin}
                    className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-emerald-400 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyOrigin}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                  >
                    {copiedOrigin ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedOrigin ? 'Tersalin' : 'Salin'}</span>
                  </button>
                </div>
              </div>

              {/* Step 2: Paste Client ID */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/60 flex items-center justify-between">
                  <span>Langkah 2: Tempel Google Client ID</span>
                  <a 
                    href="https://console.cloud.google.com/apis/credentials" 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-[var(--primary)] hover:underline flex items-center gap-1 normal-case font-normal"
                  >
                    <span>Buka Console</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder="Contoh: 123456789-abc.apps.googleusercontent.com"
                  className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-[#E95420]"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Simpan &amp; Aktifkan Google Sign-In</span>
              </button>
            </form>
          )}

          {/* TAB 3: Sandbox / Mock Testing Mode */}
          {activeTab === 'sandbox' && (
            <form onSubmit={handleSandboxAuth} className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4" />
                  <span>Mode Simulasi Pengembangan (Sandbox)</span>
                </div>
                <p className="text-[11px] text-white/70 leading-relaxed">
                  Mode ini digunakan untuk menguji fungsionalitas workspace, collection, dan API tanpa memerlukan kredensial Google Cloud resmi.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Email Akun Uji Coba
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={sandboxEmail}
                    onChange={(e) => setSandboxEmail(e.target.value)}
                    placeholder="nama@gmail.com"
                    className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-[#E95420]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Nama Tampilan (Opsional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={sandboxName}
                    onChange={(e) => setSandboxName(e.target.value)}
                    placeholder="Nama Developer"
                    className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-[#E95420]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white hover:bg-gray-100 text-gray-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Masuk dengan Akun Simulasi</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#16000F] border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Keamanan JWT &amp; Enkripsi Sesi</span>
          </div>
          <span>Penyimpanan Prisma DB</span>
        </div>
      </motion.div>
    </div>
  );
};
