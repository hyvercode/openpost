import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Server, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Send,
  Download,
  Terminal,
  Layers,
  Zap,
  ShieldCheck,
  Globe,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Laptop,
  Check,
  Github,
  Sun,
  Moon,
  MonitorSmartphone,
  Cpu,
  Database,
  ArrowRight,
  Network,
  BookOpen
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { Theme } from '../types';
import { api } from '../lib/api';
import { GoogleAuthModal } from './GoogleAuthModal';
import { DesktopDownloadModal } from './DesktopDownloadModal';
import { DeveloperDocsPage } from './DeveloperDocsPage';
import { isDesktopEnvironment } from '../utils/platform';
import { LANDING_I18N, Language } from '../utils/landingI18n';

export function AuthScreen() {
  const { theme, setTheme, setUser, addToast } = useStore();

  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-confirmation-pending'>('login');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDocsPage, setShowDocsPage] = useState(false);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);
  const isDesktop = isDesktopEnvironment();

  // Listen to #docs hash (web only)
  useEffect(() => {
    if (isDesktop) return;
    const handleHash = () => {
      if (typeof window !== 'undefined' && window.location.hash === '#docs') {
        setShowDocsPage(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [isDesktop]);

  const openDocs = () => {
    if (isDesktop) return;
    setShowDocsPage(true);
    if (typeof window !== 'undefined') {
      window.location.hash = 'docs';
    }
  };

  const closeDocs = () => {
    setShowDocsPage(false);
    if (typeof window !== 'undefined' && window.location.hash === '#docs') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  // Language state
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('openpost_lang') as Language;
      if (saved === 'id' || saved === 'en') return saved;
    }
    return 'id'; // Default to Indonesian based on user language
  });

  const t = LANDING_I18N[language] || LANDING_I18N.id;

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('openpost_lang', lang);
    addToast(lang === 'id' ? 'Bahasa diubah ke Bahasa Indonesia' : 'Language set to English', 'info', 2000);
  };

  const cycleTheme = () => {
    const order: Theme[] = ['default', 'light', 'dark'];
    const next = order[(order.indexOf(theme) + 1) % order.length];
    setTheme(next);
    addToast(
      next === 'light' ? 'Mode Terang (Light Mode)' : next === 'dark' ? 'Mode Gelap (Slate Dark)' : 'Tema Aubergine (Default)',
      'info',
      2000
    );
  };
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Verification states
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [verificationDevLink, setVerificationDevLink] = useState<string | null>(null);

  // Detected OS
  const [detectedOS, setDetectedOS] = useState<'windows' | 'mac' | 'linux'>('windows');

  // Detect user OS
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent.toLowerCase();
      if (ua.includes('mac') || ua.includes('darwin')) {
        setDetectedOS('mac');
      } else if (ua.includes('linux')) {
        setDetectedOS('linux');
      } else {
        setDetectedOS('windows');
      }
    }
  }, []);

  // Check for resetToken or verificationToken in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    const verificationToken = params.get('verificationToken') || params.get('token');

    if (resetToken) {
      setAuthMode('reset-password');
    } else if (verificationToken) {
      verifyEmailToken(verificationToken);
    }
  }, []);

  // Google OAuth Direct Handling: Check for incoming OAuth redirect tokens in URL hash
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');

      // Clear tokens from the URL bar immediately for security and clean display
      window.history.replaceState(null, '', window.location.pathname + window.location.search);

      if (accessToken || idToken) {
        processGoogleAuth({
          accessToken: accessToken || undefined,
          idToken: idToken || undefined,
        });
      }
    }
  }, []);

  const processGoogleAuth = async ({
    idToken,
    accessToken,
  }: {
    idToken?: string;
    accessToken?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      let email = '';
      let displayName = '';
      let photoURL = '';

      if (accessToken) {
        try {
          const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userinfoRes.ok) {
            const data = await userinfoRes.json();
            email = data.email;
            displayName = data.name || data.given_name;
            photoURL = data.picture;
          }
        } catch (fetchErr) {
          console.warn('Could not fetch userinfo from Google with accessToken:', fetchErr);
        }
      }

      const res = await api.post('/auth/google', {
        credential: idToken || undefined,
        email: email || undefined,
        displayName: displayName || undefined,
        photoURL: photoURL || undefined,
      });

      const { user, token, message } = res.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
      addToast(
        message ||
          (language === 'id'
            ? `Berhasil masuk sebagai ${user.displayName || user.email}!`
            : `Logged in as ${user.displayName || user.email}!`),
        'success',
        3500
      );
    } catch (err: any) {
      console.error('Google Auth callback error:', err);
      setError(
        err.response?.data?.error ||
          (language === 'id' ? 'Gagal verifikasi Google Auth dengan server.' : 'Google authentication failed.')
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDirectGoogleAuth = async () => {
    const customClientId = localStorage.getItem('openpost_google_client_id') || '';
    const activeClientId = customClientId || (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID || '';

    let clientIdToUse = activeClientId.trim();
    if (!clientIdToUse) {
      const enteredId = window.prompt(
        language === 'id'
          ? 'Masukkan Google OAuth Client ID (dari Google Cloud Console) untuk mengarahkan ke akun Google:'
          : 'Enter your Google OAuth Client ID to redirect directly to Google Auth:'
      );
      if (!enteredId || !enteredId.trim()) {
        return;
      }
      clientIdToUse = enteredId.trim();
      localStorage.setItem('openpost_google_client_id', clientIdToUse);
    }

    setLoading(true);
    setError(null);

    // If GIS OAuth2 Token Client is available, trigger popup
    if (window.google?.accounts?.oauth2) {
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientIdToUse,
          scope: 'openid email profile',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setLoading(false);
              setError(tokenResponse.error_description || tokenResponse.error);
              return;
            }
            if (tokenResponse?.access_token) {
              await processGoogleAuth({ accessToken: tokenResponse.access_token });
            }
          },
        });
        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (gisError) {
        console.warn('Google Identity Services popup error, falling back to direct redirect:', gisError);
      }
    }

    // Direct redirect to Google OAuth 2.0 authorization endpoint
    const redirectUri = window.location.origin + window.location.pathname;
    const nonce = Math.random().toString(36).substring(2);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientIdToUse
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token%20id_token&scope=${encodeURIComponent(
      'openid email profile'
    )}&nonce=${nonce}&prompt=select_account`;

    // Direct redirect to Google Auth!
    window.location.href = googleAuthUrl;
  };

  const verifyEmailToken = async (token: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get(`/auth/verify-email?token=${token}`);
      const msg = res.data?.message || (language === 'id' ? "Email berhasil diverifikasi! Silakan masuk." : "Email verified! You can now sign in.");
      setSuccess(msg);
      addToast(msg, "success", 5000);
      setAuthMode('login');
      if (res.data?.email) {
        setEmail(res.data.email);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const msg = err.response?.data?.error || (language === 'id' ? "Gagal memverifikasi email. Tautan mungkin kedaluwarsa." : "Failed to confirm email. Link may be invalid.");
      setError(msg);
      addToast(msg, "error");
    } finally {
      setLoading(false);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const handleResendVerification = async (targetEmail: string) => {
    if (!targetEmail) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/auth/resend-verification', { email: targetEmail });
      const msg = res.data?.message || (language === 'id' ? "Email konfirmasi baru telah dikirim." : "Confirmation email sent.");
      setSuccess(msg);
      if (res.data?.verificationLink) {
        setVerificationDevLink(res.data.verificationLink);
      }
      addToast(msg, "success", 4000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to resend confirmation email.");
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (authMode === 'reset-password') {
        if (password !== confirmPassword) {
          throw new Error(language === 'id' ? "Konfirmasi kata sandi tidak cocok" : "Passwords do not match");
        }
        const params = new URLSearchParams(window.location.search);
        const token = params.get('resetToken');
        await api.post('/auth/reset-password', { token, password });
        addToast(language === 'id' ? "Kata sandi berhasil direset. Silakan masuk." : "Password reset successfully. You can now login.", "success");
        setAuthMode('login');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authMode === 'forgot-password') {
        await api.post('/auth/forgot-password', { email });
        setSuccess(language === 'id' ? "Jika akun terdaftar, tautan reset akan dikirimkan ke email Anda." : "If an account exists, a reset link will be sent shortly.");
      } else if (authMode === 'register') {
        if (password !== confirmPassword) {
          throw new Error(language === 'id' ? "Konfirmasi kata sandi tidak cocok" : "Passwords do not match");
        }
        const res = await api.post('/auth/register', { email, password });
        
        setRegisteredEmail(email);
        if (res.data?.verificationLink) {
          setVerificationDevLink(res.data.verificationLink);
        }
        setAuthMode('email-confirmation-pending');
        setSuccess(language === 'id' ? "Akun berhasil dibuat! Silakan cek email Anda untuk konfirmasi." : "Account created! Please check your email to activate.");
        addToast(language === 'id' ? "Registrasi sukses! Silakan konfirmasi email." : "Registration successful! Please confirm your email.", "info", 6000);
      } else {
        // Login mode
        const res = await api.post('/auth/login', { email, password });
        const { user, token } = res.data;
        localStorage.setItem('auth_token', token);
        setUser(user);
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = err.response?.data?.error || err.message || "An error occurred. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const getOSDownloadInfo = () => {
    switch (detectedOS) {
      case 'mac':
        return { name: 'macOS', file: 'OpenPost-1.0.0.dmg', ext: '.dmg' };
      case 'linux':
        return { name: 'Linux', file: 'OpenPost-1.0.0.AppImage', ext: '.AppImage' };
      default:
        return { name: 'Windows', file: 'OpenPost-Setup-1.0.0.exe', ext: '.exe' };
    }
  };

  const osInfo = getOSDownloadInfo();

  const scrollToOverview = () => {
    const el = document.getElementById('overview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setHighlightedSection('overview');
      setTimeout(() => setHighlightedSection(null), 3000);
    }
  };

  const scrollToFeatures = () => {
    const el = document.getElementById('features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
      setHighlightedSection('features');
      setTimeout(() => setHighlightedSection(null), 3000);
    }
  };

  const renderAuthCard = () => (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden transition-colors duration-200"
    >
      {/* Auth Mode Header / Tabs */}
      {authMode === 'login' || authMode === 'register' ? (
        <div className="flex border-b border-[var(--border-subtle)] mb-6 pb-2">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-2.5 text-center text-sm font-bold transition-colors relative cursor-pointer ${
              authMode === 'login' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.auth.signIn}
            {authMode === 'login' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" 
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setError(null);
              setSuccess(null);
            }}
            className={`flex-1 pb-2.5 text-center text-sm font-bold transition-colors relative cursor-pointer ${
              authMode === 'register' ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {t.auth.createAccount}
            {authMode === 'register' && (
              <motion.div 
                layoutId="activeTabUnderline"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--primary)]" 
              />
            )}
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between mb-6 pb-3 border-b border-[var(--border-subtle)]">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            {authMode === 'forgot-password' && (language === 'id' ? 'Lupa Kata Sandi' : 'Reset Password')}
            {authMode === 'reset-password' && (language === 'id' ? 'Atur Kata Sandi Baru' : 'Set New Password')}
            {authMode === 'email-confirmation-pending' && (language === 'id' ? 'Konfirmasi Email' : 'Email Confirmation')}
          </h2>
          <button
            type="button"
            onClick={() => setAuthMode('login')}
            className="text-xs text-[var(--primary)] hover:underline font-semibold cursor-pointer"
          >
            {language === 'id' ? 'Kembali ke Masuk' : 'Back to Sign In'}
          </button>
        </div>
      )}

      {/* Error Message Banner */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{error}</span>
        </div>
      )}

      {/* Success Message Banner */}
      {success && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="leading-snug">{success}</span>
        </div>
      )}

      {/* Email Confirmation Pending Mode */}
      {authMode === 'email-confirmation-pending' ? (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[var(--bg-input)] border border-[var(--border-subtle)] text-center space-y-3">
            <div className="w-10 h-10 bg-amber-500/15 text-amber-500 rounded-full flex items-center justify-center mx-auto">
              <Send className="w-5 h-5" />
            </div>
            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
              {language === 'id' ? 'Tautan konfirmasi telah dikirimkan ke ' : 'We sent a confirmation link to '}
              <strong className="text-[var(--text-primary)]">{registeredEmail || email}</strong>.
            </p>
          </div>

          {verificationDevLink && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
              <div className="font-bold text-amber-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{language === 'id' ? 'Tautan Pengujian:' : 'Development Test Link:'}</span>
              </div>
              <a 
                href={verificationDevLink}
                className="block p-2 bg-black/40 rounded border border-white/5 text-[var(--primary)] hover:underline font-mono text-[11px] break-all"
              >
                {verificationDevLink}
              </a>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleResendVerification(registeredEmail || email)}
              disabled={loading}
              className="flex-1 h-10 bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-[var(--border-subtle)] cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>{language === 'id' ? 'Kirim Ulang' : 'Resend Email'}</span>
            </button>
            <button
              type="button"
              onClick={() => setAuthMode('login')}
              className="flex-1 h-10 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              {language === 'id' ? 'Kembali' : 'Back to Sign In'}
            </button>
          </div>
        </div>
      ) : (
        /* Regular Form */
        <form onSubmit={handleAuthSubmit} className="space-y-4">
          {/* Email Address */}
          {(authMode === 'login' || authMode === 'register' || authMode === 'forgot-password') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {t.auth.emailAddress}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Mail className="w-4 h-4" />
                </div>
                <input 
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-3 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all font-medium"
                />
              </div>
            </div>
          )}

          {/* Password */}
          {(authMode === 'login' || authMode === 'register' || authMode === 'reset-password') && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                  {t.auth.password}
                </label>
                {authMode === 'login' && (
                  <button 
                    type="button"
                    onClick={() => setAuthMode('forgot-password')}
                    className="text-[11px] text-[var(--primary)] hover:underline font-medium cursor-pointer"
                  >
                    {t.auth.forgotPassword}
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-10 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Confirm Password */}
          {(authMode === 'register' || authMode === 'reset-password') && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                {t.auth.confirmPassword}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--text-secondary)]">
                  <Lock className="w-4 h-4" />
                </div>
                <input 
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[var(--bg-input)] border border-[var(--border-subtle)] rounded-xl py-2.5 pl-10 pr-10 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/40 focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/30 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {/* Primary Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[var(--primary)]/25 active:scale-95 cursor-pointer mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>
                {authMode === 'login' && t.auth.signInBtn}
                {authMode === 'register' && t.auth.createAccountBtn}
                {authMode === 'forgot-password' && t.auth.sendResetBtn}
                {authMode === 'reset-password' && t.auth.saveNewPasswordBtn}
              </span>
            )}
          </button>

          {/* Google Auth Option */}
          {(authMode === 'login' || authMode === 'register') && (
            <div className="space-y-3 pt-1">
              {/* Divider */}
              <div className="relative flex items-center justify-center my-2">
                <div className="border-t border-[var(--border-subtle)] w-full" />
                <span className="bg-[var(--bg-surface)] px-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)] absolute">
                  {t.auth.or}
                </span>
              </div>

              {/* Google Auth Button - Directly triggers Google Auth */}
              <button
                type="button"
                onClick={handleDirectGoogleAuth}
                disabled={loading}
                className="w-full h-11 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-zinc-200 group"
              >
                <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>
                  {authMode === 'login' ? t.auth.signInWithGoogle : t.auth.signUpWithGoogle}
                </span>
              </button>

              <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] px-1 pt-0.5">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Google OAuth 2.0
                </span>
                <button
                  type="button"
                  onClick={() => setShowGoogleModal(true)}
                  className="hover:underline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                >
                  {language === 'id' ? 'Opsi Lanjutan' : 'Advanced Options'}
                </button>
              </div>
            </div>
          )}
        </form>
      )}

      {/* Quick Switcher Footer */}
      <div className="mt-6 pt-4 border-t border-[var(--border-subtle)] text-center text-xs text-[var(--text-secondary)]">
        {authMode === 'login' && (
          <div>
            {t.auth.noAccount}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setError(null);
                setSuccess(null);
              }}
              className="text-[var(--primary)] hover:underline font-bold transition-colors ml-1 cursor-pointer"
            >
              {t.auth.createAccount}
            </button>
          </div>
        )}
        {authMode === 'register' && (
          <div>
            {t.auth.alreadyHaveAccount}{' '}
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setError(null);
                setSuccess(null);
              }}
              className="text-[var(--primary)] hover:underline font-bold transition-colors ml-1 cursor-pointer"
            >
              {t.auth.signIn}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );

  // Dedicated Developer Documentation Page (Web only)
  if (showDocsPage && !isDesktop) {
    return (
      <DeveloperDocsPage 
        onBack={closeDocs}
        language={language}
        onLanguageChange={handleLanguageChange}
      />
    );
  }

  // Standalone Desktop Build View (Bypasses mini landing page completely!)
  if (isDesktop) {
    return (
      <div className={`min-h-screen font-sans flex flex-col justify-between transition-colors duration-300 ${
        theme === 'light' ? 'theme-light bg-[var(--bg-base)] text-[var(--text-primary)]' : 
        theme === 'dark' ? 'theme-dark bg-[var(--bg-base)] text-[var(--text-primary)]' : 
        'theme-default bg-[var(--bg-base)] text-[var(--text-primary)]'
      }`}>
        {/* Background Gradient & Ambient Glow */}
        <div className={`fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${
          theme === 'light' 
            ? 'bg-gradient-to-br from-slate-50 via-zinc-100 to-amber-50/20' 
            : theme === 'dark' 
            ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]' 
            : 'bg-gradient-to-br from-[#200017] via-[#3B0A29] to-[#14000E]'
        }`} />
        
        <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] blur-3xl -z-10 pointer-events-none transition-opacity duration-500 ${
          theme === 'light'
            ? 'bg-gradient-to-b from-[#DD4814]/10 to-transparent'
            : 'bg-gradient-to-b from-[#E95420]/15 to-transparent'
        }`} />

        {/* Minimal Desktop Top Bar */}
        <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur-md transition-colors duration-200">
          <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary)]/25">
                <Server className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-base tracking-tight text-[var(--text-primary)]">OpenPost</span>
                <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Desktop v1.0.0
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleLanguageChange('id')}
                  className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    language === 'id' 
                      ? 'bg-[var(--primary)] text-white shadow-xs' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="Bahasa Indonesia"
                >
                  <span>ID</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange('en')}
                  className={`px-2 py-0.5 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                    language === 'en' 
                      ? 'bg-[var(--primary)] text-white shadow-xs' 
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  }`}
                  title="English"
                >
                  <span>EN</span>
                </button>
              </div>

              {/* Theme Switcher */}
              <button
                type="button"
                onClick={cycleTheme}
                className="p-1.5 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer"
                title={`Theme: ${theme.toUpperCase()}`}
              >
                {theme === 'light' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                ) : theme === 'dark' ? (
                  <Moon className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                  <MonitorSmartphone className="w-3.5 h-3.5 text-[var(--primary)]" />
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Centered Desktop Login Main */}
        <main className="flex-1 flex flex-col items-center justify-center p-6 my-auto">
          <div className="w-full max-w-md mx-auto space-y-4">
            {renderAuthCard()}

            <div className="text-center text-[11px] text-[var(--text-secondary)] flex items-center justify-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>
                {language === 'id' 
                  ? 'Klien Desktop Mandiri · Penyimpanan SQLite Lokal · Zero CORS' 
                  : 'Standalone Desktop Client · Embedded SQLite Engine · Zero CORS'}
              </span>
            </div>
          </div>
        </main>

        <footer className="w-full py-4 text-center text-xs text-[var(--text-secondary)] border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/50">
          OpenPost Desktop · {new Date().getFullYear()} · Apache-2.0
        </footer>

        {/* Modals */}
        <GoogleAuthModal
          isOpen={showGoogleModal}
          onClose={() => setShowGoogleModal(false)}
          mode={authMode === 'register' ? 'register' : 'login'}
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
      theme === 'light' ? 'theme-light bg-[var(--bg-base)] text-[var(--text-primary)]' : 
      theme === 'dark' ? 'theme-dark bg-[var(--bg-base)] text-[var(--text-primary)]' : 
      'theme-default bg-[var(--bg-base)] text-[var(--text-primary)]'
    }`}>
      {/* Background Gradient & Ambient Glow */}
      <div className={`fixed inset-0 pointer-events-none -z-10 transition-opacity duration-500 ${
        theme === 'light' 
          ? 'bg-gradient-to-br from-slate-50 via-zinc-100 to-amber-50/20' 
          : theme === 'dark' 
          ? 'bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#020617]' 
          : 'bg-gradient-to-br from-[#200017] via-[#3B0A29] to-[#14000E]'
      }`} />
      
      <div className={`fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] blur-3xl -z-10 pointer-events-none transition-opacity duration-500 ${
        theme === 'light'
          ? 'bg-gradient-to-b from-[#DD4814]/10 to-transparent'
          : 'bg-gradient-to-b from-[#E95420]/15 to-transparent'
      }`} />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/85 backdrop-blur-md transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white shadow-md shadow-[var(--primary)]/25">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg tracking-tight text-[var(--text-primary)]">OpenPost</span>
              <span className="text-[10px] uppercase font-semibold text-[var(--text-secondary)] tracking-wider hidden sm:inline">
                API Platform
              </span>
            </div>
          </div>

          {/* Navigation Links (including targeted selector a:nth-of-type(2)) */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-[var(--text-secondary)] font-medium">
            <button
              type="button"
              onClick={scrollToFeatures}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {t.nav.features}
            </button>

            <button 
              type="button" 
              onClick={() => setShowDownloadModal(true)} 
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{t.nav.desktopApp}</span>
            </button>

            {/* Targeted element: a:nth-of-type(2) in nav */}
            <a 
              href="#overview" 
              onClick={(e) => {
                e.preventDefault();
                scrollToOverview();
              }}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Network className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{t.nav.architecture}</span>
            </a>

            <button
              type="button"
              onClick={openDocs}
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>{t.nav.docs}</span>
            </button>

            <a 
              href="https://github.com/hyvercode" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-[var(--text-primary)] transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              <span>{t.nav.github}</span>
            </a>
          </nav>

          {/* Controls: Language Switcher, Theme Switcher & Action CTA */}
          <div className="flex items-center gap-2.5">
            {/* Language Switcher */}
            <div className="flex items-center bg-[var(--bg-surface)] p-0.5 rounded-lg border border-[var(--border-subtle)] text-xs font-semibold">
              <button
                type="button"
                onClick={() => handleLanguageChange('id')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  language === 'id' 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="Bahasa Indonesia"
              >
                <span>ID</span>
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`px-2 py-1 rounded-md transition-all flex items-center gap-1 cursor-pointer ${
                  language === 'en' 
                    ? 'bg-[var(--primary)] text-white shadow-xs' 
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
                title="English"
              >
                <span>EN</span>
              </button>
            </div>

            {/* Theme Switcher */}
            <button
              type="button"
              onClick={cycleTheme}
              className="p-2 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center gap-1"
              title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-4 h-4 text-sky-400" />
              ) : (
                <MonitorSmartphone className="w-4 h-4 text-[var(--primary)]" />
              )}
            </button>

            {/* Get Started Button */}
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                const formElement = document.getElementById('auth-card');
                formElement?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[var(--primary)] hover:opacity-90 text-white text-xs font-bold transition-all shadow-md shadow-[var(--primary)]/20 active:scale-95 cursor-pointer"
            >
              {t.nav.getStarted}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Stage */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Product Value & Desktop Downloads */}
        <div className="lg:col-span-7 space-y-8">
          {/* Editorial Kicker */}
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[var(--primary)] uppercase">
            <span>{t.hero.kicker}</span>
            <span aria-hidden="true">·</span>
            <span>{t.hero.version}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[var(--text-secondary)]">{t.hero.offlineFirst}</span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-[var(--text-primary)]">
            {t.hero.title}
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-xl font-normal">
            {t.hero.subtitle}
          </p>

          {/* Desktop Download Highlight Box */}
          <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] backdrop-blur-md shadow-xl space-y-4 max-w-xl transition-colors duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <span>{t.desktopCard.title}</span>
                    <span className="text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      {t.desktopCard.standalone}
                    </span>
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {t.desktopCard.desc}
                  </div>
                </div>
              </div>
            </div>

            {/* Download CTA Button & Quick Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="h-11 px-5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[var(--primary)]/25 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{t.desktopCard.downloadFor} {osInfo.name} ({osInfo.ext})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="h-11 px-4 bg-[var(--bg-panel)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border border-[var(--border-subtle)] transition-colors cursor-pointer"
              >
                <span>{t.desktopCard.otherPlatforms}</span>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
              </button>
            </div>

            {/* Natural Badges */}
            <div className="pt-2 border-t border-[var(--border-subtle)] flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-[var(--text-secondary)]">
              <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>{t.desktopCard.zeroCors}</span>
              </div>
              <span aria-hidden="true" className="opacity-30">·</span>
              <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t.desktopCard.completeOffline}</span>
              </div>
              <span aria-hidden="true" className="opacity-30">·</span>
              <div className="flex items-center gap-1.5 text-[var(--text-primary)]">
                <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                <span>{t.desktopCard.noAccountNeeded}</span>
              </div>
            </div>
          </div>

          {/* Micro Value Proposition Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 max-w-xl">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors duration-200">
              <div className="text-[var(--primary)] text-xs font-bold mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>{t.valueProps.multiProtocol}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {t.valueProps.multiProtocolDesc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] transition-colors duration-200">
              <div className="text-amber-500 text-xs font-bold mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>{t.valueProps.mockServers}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {t.valueProps.mockServersDesc}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] col-span-2 sm:col-span-1 transition-colors duration-200">
              <div className="text-emerald-500 text-xs font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{t.valueProps.zeroTelemetry}</span>
              </div>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                {t.valueProps.zeroTelemetryDesc}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Modern Minimalist Auth Card */}
        <div id="auth-card" className="lg:col-span-5 w-full max-w-md mx-auto">
          {renderAuthCard()}
        </div>
      </main>

      {/* Architecture Overview Section (Targeted by nav link: a:nth-of-type(2)) */}
      <section 
        id="overview" 
        className={`w-full border-t border-[var(--border-subtle)] py-16 px-6 transition-all duration-500 ${
          highlightedSection === 'overview' ? 'ring-2 ring-[var(--primary)] bg-[var(--primary)]/5' : 'bg-[var(--bg-surface)]/60'
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-12">
          {/* Section Header */}
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold mb-1">
              <Network className="w-3.5 h-3.5" />
              <span>Full-Stack Architecture</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
              {t.architecture.title}
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">
              {t.architecture.subtitle}
            </p>
          </div>

          {/* Architecture Visual Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Box 1: Client */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md space-y-3 relative group hover:border-[var(--primary)]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 text-blue-500 flex items-center justify-center">
                <Laptop className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t.architecture.clientTitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.architecture.clientDesc}
              </p>
              <div className="pt-2 text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                Vite · Tailwind CSS · Monaco
              </div>
            </div>

            {/* Box 2: Express Server */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md space-y-3 relative group hover:border-[var(--primary)]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t.architecture.serverTitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.architecture.serverDesc}
              </p>
              <div className="pt-2 text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                Node.js · Express · esbuild
              </div>
            </div>

            {/* Box 3: Dual Storage */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md space-y-3 relative group hover:border-[var(--primary)]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-500 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t.architecture.dbTitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.architecture.dbDesc}
              </p>
              <div className="pt-2 text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                Prisma 7 · SQLite · PostgreSQL
              </div>
            </div>

            {/* Box 4: Agent Bridge */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] shadow-md space-y-3 relative group hover:border-[var(--primary)]/50 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                {t.architecture.bridgeTitle}
              </h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.architecture.bridgeDesc}
              </p>
              <div className="pt-2 text-[10px] font-mono text-[var(--text-secondary)] border-t border-[var(--border-subtle)]">
                Localhost Bridge · Port 8765
              </div>
            </div>
          </div>

          {/* Interactive Live Verification Card */}
          <div className="p-6 rounded-2xl bg-[var(--bg-base)] border border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-1 text-center md:text-left">
              <div className="text-sm font-bold text-[var(--text-primary)] flex items-center justify-center md:justify-start gap-2">
                <span>Want to test the backend API right now?</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-[var(--text-secondary)]">
                The local backend server is running and responding to real API queries.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  try {
                    const res = await api.get('/health');
                    addToast(`API Health OK: ${JSON.stringify(res.data)}`, 'success', 3000);
                  } catch (e: any) {
                    addToast(`Health check error: ${e.message}`, 'error', 3000);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] text-xs font-mono text-[var(--text-primary)] border border-[var(--border-subtle)] transition-colors cursor-pointer flex items-center gap-2"
              >
                <span>GET /api/health</span>
                <ArrowRight className="w-3.5 h-3.5 text-[var(--primary)]" />
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-xs font-bold transition-all shadow-md active:scale-95 cursor-pointer"
              >
                {t.nav.downloadDesktop}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Overview Strip */}
      <section 
        id="features" 
        className={`w-full border-t border-[var(--border-subtle)] py-16 px-6 transition-all duration-500 ${
          highlightedSection === 'features' ? 'ring-2 ring-[var(--primary)] bg-[var(--primary)]/5' : 'bg-[var(--bg-base)]'
        }`}
      >
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
              {t.features.title}
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              {t.features.subtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 transition-colors duration-200">
              <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/15 border border-[var(--primary)]/30 flex items-center justify-center text-[var(--primary)]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.features.feat1Title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.features.feat1Desc}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 transition-colors duration-200">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.features.feat2Title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.features.feat2Desc}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-3 transition-colors duration-200">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
                <Laptop className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">{t.features.feat3Title}</h3>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                {t.features.feat3Desc}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-[var(--border-subtle)] py-8 px-6 bg-[var(--bg-surface)] text-[11px] text-[var(--text-secondary)] transition-colors duration-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[var(--text-primary)]">OpenPost</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 Open Source Project by hyvercode</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {t.nav.downloadDesktop}
            </button>
            <a 
              href="https://github.com/hyvercode" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-[var(--text-primary)] transition-colors"
            >
              GitHub
            </a>
            <button
              type="button"
              onClick={scrollToOverview}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {t.nav.architecture}
            </button>
            <button
              type="button"
              onClick={openDocs}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              {t.nav.docs}
            </button>
            <button
              type="button"
              onClick={cycleTheme}
              className="hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Theme: {theme.toUpperCase()}
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <GoogleAuthModal
        isOpen={showGoogleModal}
        onClose={() => setShowGoogleModal(false)}
        mode={authMode === 'register' ? 'register' : 'login'}
      />

      <DesktopDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        detectedOS={detectedOS}
      />
    </div>
  );
}
