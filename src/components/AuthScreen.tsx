import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MonitorSmartphone, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { useStore } from '../store/useStore';
import axios from 'axios';

export function AuthScreen() {
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'forgot-password' | 'reset-password'>('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { setUser, addToast } = useStore();

  // Check for resetToken in URL
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const resetToken = params.get('resetToken');
    if (resetToken) {
      setAuthMode('reset-password');
    }
  }, []);

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
        await axios.post('/api/auth/reset-password', { token, password });
        addToast("Password reset successfully. You can now login.", "success");
        setAuthMode('login');
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (authMode === 'forgot-password') {
        await axios.post('/api/auth/forgot-password', { email });
        setSuccess("If an account exists with that email, you will receive a reset link shortly.");
      } else {
        const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
        const res = await axios.post(endpoint, { email, password });
        
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
      case 'forgot-password': return 'Reset Password';
      case 'reset-password': return 'Set New Password';
    }
  };

  const renderSubtitle = () => {
    switch (authMode) {
      case 'login': return 'Sign in to your account';
      case 'register': return 'Start building better APIs today';
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
              <MonitorSmartphone className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight mb-2">
              {renderTitle()}
            </h1>
            <p className="text-sm text-white/50 font-medium">
              {renderSubtitle()}
            </p>
          </div>

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

            {authMode === 'reset-password' && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Confirm Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-white/30 group-focus-within:text-[#E95420] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#1F0015] border border-white/5 rounded-xl py-3 pl-10 pr-12 text-sm font-medium placeholder:text-white/10 focus:outline-none focus:border-[#E95420]/50 focus:bg-[#2C001E] transition-all"
                  />
                </div>
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
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </motion.div>
              )}
              {success && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-green-500/10 text-green-400 text-xs py-2.5 px-3 rounded-lg flex items-center gap-2 border border-green-500/20"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  {success}
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
