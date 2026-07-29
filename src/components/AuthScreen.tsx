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
  Send
} from 'lucide-react';
import { useStore } from '../store/useStore';
import { api } from '../lib/api';

export function AuthScreen() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password' | 'email-confirmation-pending'>('login');
  
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

  const { setUser, addToast } = useStore();

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
        // Clean URL
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

  const renderTitle = () => {
    switch (authMode) {
      case 'login': return 'Welcome to OpenPost';
      case 'register': return 'Join OpenPost';
      case 'email-confirmation-pending': return 'Confirm Your Email';
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
    }
  };

  const renderSubtitle = () => {
    switch (authMode) {
      case 'login': return 'Sign in to your account';
      case 'register': return 'Start building better APIs today';
      case 'email-confirmation-pending': return `We sent a confirmation link to ${registeredEmail || email}`;
      case 'forgot-password': return 'Enter your email to receive a reset link';
      case 'reset-password': return 'Enter your new secure password';
    }
  };

  return (
    <div className="min-h-screen bg-[#2C001E] text-white selection:bg-[#E95420]/30 flex flex-col items-center justify-center p-6">
      {/* Ubuntu Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2C001E] via-[#5E2750] to-[#2C001E] -z-10 opacity-50" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-[#3D0C2A] border border-white/5 rounded-2xl p-8 md:p-10 shadow-2xl relative overflow-hidden ring-1 ring-white/10">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="w-12 h-12 bg-[#E95420] rounded-xl flex items-center justify-center shadow-lg shadow-[#E95420]/20 mb-6">
              {authMode === 'email-confirmation-pending' ? (
                <Mail className="w-6 h-6 text-white" />
              ) : (
                <Server className="w-6 h-6 text-white" />
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {renderTitle()}
            </h1>
            <p className="text-sm text-white/50 font-medium">
              {renderSubtitle()}
            </p>
          </div>

          {authMode === 'email-confirmation-pending' ? (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#1F0015] border border-white/10 text-center space-y-3">
                <div className="w-10 h-10 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto">
                  <Send className="w-5 h-5" />
                </div>
                <p className="text-xs text-white/70 leading-relaxed">
                  Your account has been created, but <span className="text-[#E95420] font-bold">you must confirm your email</span> before you can log in.
                </p>
                <p className="text-[11px] text-white/40">
                  Please check your inbox (and spam folder) for the verification email.
                </p>
              </div>

              {/* Dev Simulation / Copy Link Box */}
              {verificationDevLink && (
                <div className="p-3.5 rounded-xl bg-[#E95420]/10 border border-[#E95420]/30 text-xs space-y-2">
                  <div className="flex items-center justify-between font-bold text-[#E95420] text-[11px] uppercase tracking-wider">
                    <span>Email Confirmation Link</span>
                    <span className="text-[9px] bg-[#E95420] text-white px-1.5 py-0.5 rounded font-mono">Dev / Demo Mode</span>
                  </div>
                  <a 
                    href={verificationDevLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 p-2 rounded bg-[#1F0015] hover:bg-[#2C001E] border border-white/10 text-[#E95420] font-mono text-[11px] break-all group transition-colors"
                  >
                    <span className="truncate">{verificationDevLink}</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0 text-white/50 group-hover:text-[#E95420]" />
                  </a>
                  <p className="text-[10px] text-white/50">
                    Click the link above to simulate confirming your email in your browser!
                  </p>
                </div>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 text-red-400 text-xs py-2.5 px-3 rounded-lg flex items-center gap-2 border border-red-500/20"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-500/10 text-green-400 text-xs py-2.5 px-3 rounded-lg flex items-center gap-2 border border-green-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-400" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="button"
                disabled={loading}
                onClick={() => handleResendVerification(registeredEmail || email)}
                className="w-full h-11 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Resend Confirmation Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAuthMode('login')}
                className="w-full h-12 bg-[#E95420] hover:bg-[#c7461b] text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#E95420]/20 active:scale-95"
              >
                Go to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {(authMode === 'login' || authMode === 'register' || authMode === 'forgot-password') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Email Address</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#E95420] transition-colors">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input 
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="w-full bg-[#1F0015] border border-white/5 rounded-xl py-3 pl-10 pr-4 text-sm font-medium placeholder:text-white/10 focus:outline-none focus:border-[#E95420]/50 focus:bg-[#2C001E] transition-all"
                    />
                  </div>
                </div>
              )}

              {(authMode === 'login' || authMode === 'register' || authMode === 'reset-password') && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Password</label>
                    {authMode === 'login' && (
                      <button 
                        type="button"
                        onClick={() => setAuthMode('forgot-password')}
                        className="text-[10px] text-[#E95420] hover:text-[#f4683a] font-bold transition-colors"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#E95420] transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1F0015] border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm font-medium placeholder:text-white/10 focus:outline-none focus:border-[#E95420]/50 focus:bg-[#2C001E] transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/20 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {(authMode === 'reset-password' || authMode === 'register') && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Confirm Password</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#E95420] transition-colors">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input 
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#1F0015] border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm font-medium placeholder:text-white/10 focus:outline-none focus:border-[#E95420]/50 focus:bg-[#2C001E] transition-all"
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-white/20 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-red-500/10 text-red-400 text-xs p-3 rounded-lg space-y-2 border border-red-500/20"
                  >
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                    {/* If error contains unverified email message, show quick resend link */}
                    {error.toLowerCase().includes('not been confirmed') && email && (
                      <button
                        type="button"
                        onClick={() => handleResendVerification(email)}
                        className="text-[11px] font-bold text-[#E95420] hover:underline flex items-center gap-1 pt-1 border-t border-red-500/10"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend Confirmation Email to {email}</span>
                      </button>
                    )}
                  </motion.div>
                )}
                {success && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="bg-green-500/10 text-green-400 text-xs py-2.5 px-3 rounded-lg flex items-center gap-2 border border-green-500/20"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-400" />
                    <span>{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <button 
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-[#E95420] hover:bg-[#c7461b] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#E95420]/20 active:scale-95 mt-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  authMode === 'login' ? 'Sign In' : 
                  authMode === 'register' ? 'Create Account' :
                  authMode === 'forgot-password' ? 'Send Reset Link' : 'Reset Password'
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-xs text-white/40 font-medium">
            {authMode === 'login' && (
              <>
                Don't have an account?{' '}
                <button 
                  onClick={() => setAuthMode('register')}
                  className="text-[#E95420] hover:text-[#f4683a] font-bold ml-1 transition-colors"
                >
                  Register now
                </button>
              </>
            )}
            {authMode === 'register' && (
              <>
                Already have an account?{' '}
                <button 
                  onClick={() => setAuthMode('login')}
                  className="text-[#E95420] hover:text-[#f4683a] font-bold ml-1 transition-colors"
                >
                  Sign in
                </button>
              </>
            )}
            {(authMode === 'forgot-password' || authMode === 'reset-password') && (
              <button 
                onClick={() => setAuthMode('login')}
                className="text-[#E95420] hover:text-[#f4683a] font-bold transition-colors"
              >
                Back to Sign in
              </button>
            )}
          </p>
        </div>

        <p className="mt-10 text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
          © 2026 OpenPost • API Powered by hyvercode
        </p>
      </motion.div>
    </div>
  );
}
