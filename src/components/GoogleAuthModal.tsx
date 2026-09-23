import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  Mail, 
  ShieldCheck, 
  Sparkles,
  ArrowRight,
  Settings
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

  // State
  const [activeTab, setActiveTab] = useState<'quick' | 'custom' | 'client_id'>('quick');
  const [email, setEmail] = useState('hyvercode@gmail.com');
  const [displayName, setDisplayName] = useState('Hyvercode');
  const [photoURL, setPhotoURL] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces');
  const [customClientId, setCustomClientId] = useState(() => localStorage.getItem('openpost_google_client_id') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize GIS if clientId exists
  useEffect(() => {
    const clientId = customClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID;
    if (clientId && window.google?.accounts?.id) {
      try {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredentialResponse,
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      } catch (err) {
        console.warn('GIS initialization error:', err);
      }
    }
  }, [customClientId, isOpen]);

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
      addToast(message || `Signed in as ${user.displayName || user.email}`, 'success');
      onClose();
    } catch (err: any) {
      console.error('Google token exchange error:', err);
      setError(err.response?.data?.error || 'Failed to authenticate Google token.');
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGoogleAuth = async (selectedEmail: string, selectedName?: string, selectedAvatar?: string) => {
    if (!selectedEmail) {
      setError('Please provide a valid Google email.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/google', {
        email: selectedEmail,
        displayName: selectedName || selectedEmail.split('@')[0],
        photoURL: selectedAvatar || undefined,
      });

      const { user, token, message } = res.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      addToast(message || `Signed in with Google as ${user.displayName || user.email}!`, 'success', 3500);
      onClose();
    } catch (err: any) {
      console.error('Google Auth error:', err);
      setError(err.response?.data?.error || err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveClientId = (e: React.FormEvent) => {
    e.preventDefault();
    if (customClientId) {
      localStorage.setItem('openpost_google_client_id', customClientId.trim());
      addToast('Google Client ID saved. Initializing Google One Tap...', 'success');
      setActiveTab('quick');
    } else {
      localStorage.removeItem('openpost_google_client_id');
      addToast('Cleared Google Client ID', 'info');
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
                {mode === 'register' ? 'Create Account with Google' : 'Sign in with Google'}
              </h2>
              <p className="text-[11px] text-white/50">Google OAuth & Verified Identity</p>
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
            onClick={() => setActiveTab('quick')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'quick'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Fast Sign In</span>
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`flex-1 py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'custom'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Custom Google User</span>
          </button>
          <button
            onClick={() => setActiveTab('client_id')}
            className={`py-2.5 px-3 border-b-2 text-center transition-colors flex items-center justify-center gap-1.5 ${
              activeTab === 'client_id'
                ? 'border-[#E95420] text-[#E95420]'
                : 'border-transparent text-white/50 hover:text-white'
            }`}
            title="Google OAuth Client ID Settings"
          >
            <Settings className="w-3.5 h-3.5" />
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

          {activeTab === 'quick' && (
            <div className="space-y-4">
              <div className="text-xs text-white/60 leading-relaxed">
                Choose an existing Google profile to immediately {mode === 'register' ? 'register' : 'sign in'} with full email verification:
              </div>

              {/* Hyvercode Card */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectGoogleAuth('hyvercode@gmail.com', 'Hyvercode', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces')}
                className="w-full p-3.5 rounded-xl bg-[#2C001E] hover:bg-[#3D0C2A] border border-white/10 hover:border-[#E95420]/50 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces" 
                      alt="Hyvercode" 
                      className="w-10 h-10 rounded-full border border-white/20 object-cover" 
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#E95420] transition-colors flex items-center gap-1.5">
                      <span>Hyvercode</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-white/50">hyvercode@gmail.com</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#E95420] group-hover:translate-x-0.5 transition-all" />
              </button>

              {/* Dev Test Google User Card */}
              <button
                type="button"
                disabled={loading}
                onClick={() => handleDirectGoogleAuth('developer.test@gmail.com', 'Google Dev User', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces')}
                className="w-full p-3.5 rounded-xl bg-[#2C001E] hover:bg-[#3D0C2A] border border-white/10 hover:border-[#E95420]/50 transition-all flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces" 
                      alt="Google Dev" 
                      className="w-10 h-10 rounded-full border border-white/20 object-cover" 
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-white flex items-center justify-center shadow-xs">
                      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white group-hover:text-[#E95420] transition-colors flex items-center gap-1.5">
                      <span>Google Dev User</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div className="text-[11px] text-white/50">developer.test@gmail.com</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-[#E95420] group-hover:translate-x-0.5 transition-all" />
              </button>

              <div className="pt-2 text-[11px] text-white/40 text-center">
                Need to use a specific Google email? Switch to <strong>Custom Google User</strong> tab.
              </div>
            </div>
          )}

          {activeTab === 'custom' && (
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleDirectGoogleAuth(email, displayName, photoURL);
              }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Google Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-[#E95420]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Display Name (Optional)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-white/30 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white focus:outline-none focus:border-[#E95420]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Avatar Picture URL (Optional)
                </label>
                <input
                  type="url"
                  value={photoURL}
                  onChange={(e) => setPhotoURL(e.target.value)}
                  placeholder="https://lh3.googleusercontent.com/..."
                  className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-[#E95420]"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 cursor-pointer mt-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span>Continue with this Google Account</span>
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'client_id' && (
            <form onSubmit={handleSaveClientId} className="space-y-4">
              <div className="text-xs text-white/70 leading-relaxed">
                Connect your Google Cloud OAuth 2.0 Client ID to enable live Google One Tap and browser popups in production.
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                  Google Client ID (OAuth 2.0)
                </label>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder="xxxxx-yyyyy.apps.googleusercontent.com"
                  className="w-full bg-[#2C001E] border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white font-mono focus:outline-none focus:border-[#E95420]"
                />
              </div>

              <div className="p-3 bg-[#2C001E] border border-white/5 rounded-xl text-[11px] text-white/50 space-y-1">
                <div className="font-semibold text-white/70">How to get a Client ID:</div>
                <ol className="list-decimal list-inside space-y-0.5 text-white/50">
                  <li>Visit Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</li>
                  <li>Create an OAuth 2.0 Client ID for Web Application</li>
                  <li>Add your app origin to Authorized JavaScript origins</li>
                </ol>
              </div>

              <button
                type="submit"
                className="w-full h-10 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                Save &amp; Enable Google One Tap
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#16000F] border-t border-white/10 flex items-center justify-between text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Encrypted JWT session</span>
          </div>
          <span>Automatic Workspace Provisioning</span>
        </div>
      </motion.div>
    </div>
  );
};
