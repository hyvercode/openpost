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
  BookOpen,
  Cpu
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';
import { GoogleAuthModal } from './GoogleAuthModal';
import { DesktopDownloadModal } from './DesktopDownloadModal';

export function AuthScreen() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-confirmation-pending'>('login');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  
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

  const { setUser, addToast } = useStore();

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

  const verifyEmailToken = async (token: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await api.get(`/auth/verify-email?token=${token}`);
      const msg = res.data?.message || "Email address verified successfully! You can now sign in.";
      setSuccess(msg);
      addToast("Email address confirmed! Please sign in.", "success", 5000);
      setAuthMode('login');
      if (res.data?.email) {
        setEmail(res.data.email);
      }
    } catch (err: any) {
      console.error("Verification error:", err);
      const msg = err.response?.data?.error || "Failed to confirm email. Link may be invalid or expired.";
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
      const msg = res.data?.message || "A new confirmation email has been sent. Please check your inbox.";
      setSuccess(msg);
      if (res.data?.verificationLink) {
        setVerificationDevLink(res.data.verificationLink);
      }
      addToast("Confirmation email sent!", "success", 4000);
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
          throw new Error("Passwords do not match");
        }
        const params = new URLSearchParams(window.location.search);
        const token = params.get('resetToken');
        await api.post('/auth/reset-password', { token, password });
        addToast("Password reset successfully. You can now login.", "success");
        setAuthMode('login');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authMode === 'forgot-password') {
        await api.post('/auth/forgot-password', { email });
        setSuccess("If an account exists with that email, you will receive a reset link shortly.");
      } else if (authMode === 'register') {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match");
        }
        const res = await api.post('/auth/register', { email, password });
        
        setRegisteredEmail(email);
        if (res.data?.verificationLink) {
          setVerificationDevLink(res.data.verificationLink);
        }
        setAuthMode('email-confirmation-pending');
        setSuccess("Account created! A confirmation email has been sent to your address.");
        addToast("Registration successful! Please confirm your email before logging in.", "info", 6000);
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

  return (
    <div className="min-h-screen bg-[#200017] text-white selection:bg-[#E95420]/30 flex flex-col font-sans">
      {/* Background Gradient & Ambient Glow */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#200017] via-[#3B0A29] to-[#14000E] -z-10 pointer-events-none" />
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[450px] bg-gradient-to-b from-[#E95420]/15 to-transparent blur-3xl -z-10 pointer-events-none" />

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-white/5 bg-[#200017]/85 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#E95420] flex items-center justify-center text-white shadow-md shadow-[#E95420]/25">
              <Server className="w-4 h-4" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-lg tracking-tight text-white">OpenPost</span>
              <span className="text-[10px] uppercase font-semibold text-white/40 tracking-wider hidden sm:inline">
                API Platform
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs text-white/60 font-medium">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <button 
              type="button" 
              onClick={() => setShowDownloadModal(true)} 
              className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Laptop className="w-3.5 h-3.5 text-[#E95420]" />
              <span>Desktop App</span>
            </button>
            <a href="#overview" className="hover:text-white transition-colors">Architecture</a>
            <a 
              href="https://github.com/hyvercode" 
              target="_blank" 
              rel="noreferrer" 
              className="hover:text-white transition-colors flex items-center gap-1"
            >
              <Github className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </nav>

          {/* Top CTAs */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/80 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#E95420]" />
              <span>Download Desktop</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                const formElement = document.getElementById('auth-card');
                formElement?.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-3.5 py-1.5 rounded-lg bg-[#E95420] hover:bg-[#c7461b] text-white text-xs font-bold transition-all shadow-md shadow-[#E95420]/20 active:scale-95 cursor-pointer"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Auth Stage */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left Column: Product Value & Desktop Downloads */}
        <div className="lg:col-span-7 space-y-8">
          {/* Editorial Kicker */}
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#E95420] uppercase">
            <span>Open Source API Client</span>
            <span aria-hidden="true">·</span>
            <span>Version 1.0.0</span>
            <span aria-hidden="true">·</span>
            <span className="text-white/40">Offline First</span>
          </div>

          {/* Punchy Headline */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.15] text-white">
            The lightweight, offline-first API workspace for engineers.
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-white/60 leading-relaxed max-w-xl font-normal">
            Design, debug, and automate REST, GraphQL, WebSocket, and SSE endpoints with zero cloud friction. Run standalone on your desktop with an embedded offline backend and SQLite database, or collaborate with your team in real time.
          </p>

          {/* Desktop Download Highlight Box */}
          <div className="p-6 rounded-2xl bg-[#2C001E]/80 border border-white/10 backdrop-blur-md shadow-xl space-y-4 max-w-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#E95420]/15 border border-[#E95420]/30 flex items-center justify-center text-[#E95420]">
                  <Laptop className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>OpenPost Desktop</span>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      Standalone
                    </span>
                  </div>
                  <div className="text-[11px] text-white/40">
                    Includes embedded background server &amp; local SQLite engine
                  </div>
                </div>
              </div>
            </div>

            {/* Download CTA Button & Quick Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="h-11 px-5 bg-gradient-to-r from-[#E95420] to-[#f4683a] hover:from-[#d84a19] hover:to-[#e45b2e] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-[#E95420]/30 active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download for {osInfo.name} ({osInfo.ext})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDownloadModal(true)}
                className="h-11 px-4 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl font-medium text-xs flex items-center justify-center gap-1.5 border border-white/10 transition-colors cursor-pointer"
              >
                <span>Other Platforms</span>
                <ChevronRight className="w-3.5 h-3.5 text-white/40" />
              </button>
            </div>

            {/* Natural Typographic Badges (No pill soup) */}
            <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-white/50">
              <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>Zero CORS Blockers</span>
              </div>
              <span aria-hidden="true" className="text-white/20">·</span>
              <div className="flex items-center gap-1.5 text-white/70">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Complete Offline Mode</span>
              </div>
              <span aria-hidden="true" className="text-white/20">·</span>
              <div className="flex items-center gap-1.5 text-white/70">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>No Account Required for Desktop</span>
              </div>
            </div>
          </div>

          {/* Micro Value Proposition Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2 max-w-xl">
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-[#E95420] text-xs font-bold mb-1 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                <span>Multi-Protocol</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                REST, GraphQL Studio, WebSocket, &amp; SSE streams.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5">
              <div className="text-amber-400 text-xs font-bold mb-1 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                <span>Mock Servers</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Spin up instant mock endpoints with custom JSON &amp; delays.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 col-span-2 sm:col-span-1">
              <div className="text-emerald-400 text-xs font-bold mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Telemetry</span>
              </div>
              <p className="text-[11px] text-white/50 leading-relaxed">
                Your API secrets and payload stay strictly local.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Modern Minimalist Auth Card */}
        <div id="auth-card" className="lg:col-span-5 w-full max-w-md mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-[#2D001E] border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden ring-1 ring-white/10"
          >
            {/* Auth Mode Header / Tabs */}
            {authMode === 'login' || authMode === 'register' ? (
              <div className="flex border-b border-white/10 mb-6 pb-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setError(null);
                    setSuccess(null);
                  }}
                  className={`flex-1 pb-2.5 text-center text-sm font-bold transition-colors relative cursor-pointer ${
                    authMode === 'login' ? 'text-white' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  Sign In
                  {authMode === 'login' && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E95420]" 
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
                    authMode === 'register' ? 'text-white' : 'text-white/40 hover:text-white/80'
                  }`}
                >
                  Create Account
                  {authMode === 'register' && (
                    <motion.div 
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E95420]" 
                    />
                  )}
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/10">
                <h2 className="text-base font-bold text-white">
                  {authMode === 'forgot-password' && 'Reset Password'}
                  {authMode === 'reset-password' && 'Set New Password'}
                  {authMode === 'email-confirmation-pending' && 'Email Confirmation'}
                </h2>
                <button
                  type="button"
                  onClick={() => setAuthMode('login')}
                  className="text-xs text-[#E95420] hover:underline font-semibold"
                >
                  Back to Sign In
                </button>
              </div>
            )}

            {/* Error Message Banner */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {success && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{success}</span>
              </div>
            )}

            {/* Email Confirmation Pending Mode */}
            {authMode === 'email-confirmation-pending' ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-[#1A0012] border border-white/5 text-center space-y-3">
                  <div className="w-10 h-10 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                    <Send className="w-5 h-5" />
                  </div>
                  <p className="text-xs text-white/70 leading-relaxed">
                    We sent a confirmation link to <strong className="text-white">{registeredEmail || email}</strong>. Please check your inbox to activate your account.
                  </p>
                </div>

                {verificationDevLink && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                    <div className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Development Test Link:</span>
                    </div>
                    <a 
                      href={verificationDevLink}
                      className="block p-2 bg-black/40 rounded border border-white/5 text-[#E95420] hover:underline font-mono text-[11px] break-all"
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
                    className="flex-1 h-10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-white/10 cursor-pointer"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    <span>Resend Email</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMode('login')}
                    className="flex-1 h-10 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            ) : (
              /* Regular Form */
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {/* Email Address */}
                {(authMode === 'login' || authMode === 'register' || authMode === 'forgot-password') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      Email Address
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input 
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-[#180011] border border-white/10 rounded-xl py-2.5 pl-10 pr-3 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E95420] focus:ring-1 focus:ring-[#E95420]/30 transition-all font-medium"
                      />
                    </div>
                  </div>
                )}

                {/* Password */}
                {(authMode === 'login' || authMode === 'register' || authMode === 'reset-password') && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                        Password
                      </label>
                      {authMode === 'login' && (
                        <button 
                          type="button"
                          onClick={() => setAuthMode('forgot-password')}
                          className="text-[11px] text-[#E95420] hover:underline font-medium"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#180011] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E95420] focus:ring-1 focus:ring-[#E95420]/30 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/30 hover:text-white transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {/* Confirm Password */}
                {(authMode === 'register' || authMode === 'reset-password') && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-white/50">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input 
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-[#180011] border border-white/10 rounded-xl py-2.5 pl-10 pr-10 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-[#E95420] focus:ring-1 focus:ring-[#E95420]/30 transition-all font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/30 hover:text-white transition-colors"
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
                  className="w-full h-11 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#E95420]/25 active:scale-95 cursor-pointer mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>
                        {authMode === 'login' && 'Sign In to Workspace'}
                        {authMode === 'register' && 'Create Free Account'}
                        {authMode === 'forgot-password' && 'Send Reset Link'}
                        {authMode === 'reset-password' && 'Save New Password'}
                      </span>
                    </>
                  )}
                </button>

                {/* Google Auth Option (Located cleanly BELOW the primary button as requested) */}
                {(authMode === 'login' || authMode === 'register') && (
                  <div className="space-y-3 pt-1">
                    {/* Divider */}
                    <div className="relative flex items-center justify-center my-2">
                      <div className="border-t border-white/10 w-full" />
                      <span className="bg-[#2D001E] px-2.5 text-[10px] font-bold uppercase tracking-wider text-white/35 absolute">
                        or
                      </span>
                    </div>

                    {/* Google Auth Button */}
                    <button
                      type="button"
                      onClick={() => setShowGoogleModal(true)}
                      className="w-full h-11 bg-white hover:bg-zinc-100 text-zinc-900 rounded-xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md active:scale-95 cursor-pointer border border-white/20 group"
                    >
                      <svg className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                      <span>
                        {authMode === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
                      </span>
                    </button>
                  </div>
                )}
              </form>
            )}

            {/* Quick Switcher Footer */}
            <div className="mt-6 pt-4 border-t border-white/5 text-center text-xs text-white/50">
              {authMode === 'login' && (
                <div>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[#E95420] hover:text-[#f4683a] font-bold transition-colors ml-1"
                  >
                    Create Account
                  </button>
                </div>
              )}
              {authMode === 'register' && (
                <div>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-[#E95420] hover:text-[#f4683a] font-bold transition-colors ml-1"
                  >
                    Sign In
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Feature Overview Strip */}
      <section id="features" className="w-full border-t border-white/5 bg-[#170010]/80 py-16 px-6">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              Engineered for developer velocity &amp; privacy
            </h2>
            <p className="text-xs text-white/50">
              All the essentials of a modern API client without bloated cloud lock-in or tracking.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl bg-[#26001B] border border-white/5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-[#E95420]/15 border border-[#E95420]/30 flex items-center justify-center text-[#E95420]">
                <Zap className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Full-Stack API Client &amp; Scripting</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Test REST, GraphQL with interactive schema introspection, WebSocket, and SSE. Full support for Postman-compatible test scripts (<code className="text-white/80 font-mono">pm.*</code>) and dynamic environment variables.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl bg-[#26001B] border border-white/5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Mock Servers &amp; Batch Runner</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Simulate backend endpoints instantly with custom status codes, headers, and payloads. Run automated regression test suites using data-driven CSV or JSON test matrices.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl bg-[#26001B] border border-white/5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Laptop className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-white">Native Desktop &amp; Local Agent</h3>
              <p className="text-xs text-white/50 leading-relaxed">
                Download the standalone desktop application powered by an embedded offline server and SQLite engine. Includes local proxy bridge to eliminate CORS barriers completely.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="w-full border-t border-white/5 py-8 px-6 bg-[#12000D] text-[11px] text-white/40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white/70">OpenPost</span>
            <span aria-hidden="true">·</span>
            <span>© 2026 Open Source Project by hyvercode</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Desktop Downloads
            </button>
            <a 
              href="https://github.com/hyvercode" 
              target="_blank" 
              rel="noreferrer"
              className="hover:text-white transition-colors"
            >
              GitHub
            </a>
            <a href="#features" className="hover:text-white transition-colors">
              Documentation
            </a>
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
