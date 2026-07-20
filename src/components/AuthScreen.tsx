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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  
  // Auth Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser } = useStore();

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(endpoint, { email, password });
      
      const { user, token } = res.data;
      localStorage.setItem('auth_token', token);
      setUser(user);
    } catch (err: any) {
      console.error("Auth error:", err);
      let message = err.response?.data?.error || "An error occurred. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
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
              {authMode === 'login' ? 'Welcome to OpenPost' : 'Join OpenPost'}
            </h1>
            <p className="text-sm text-white/50 font-medium">
              {authMode === 'login' 
                ? 'Sign in to your account' 
                : 'Start building better APIs today'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-4">
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

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Password</label>
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
            </AnimatePresence>

            <button 
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-[#E95420] hover:bg-[#c7461b] disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-[#E95420]/20 active:scale-95 mt-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                authMode === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-white/40 font-medium">
            {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
            <button 
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-[#E95420] hover:text-[#f4683a] font-bold ml-1 transition-colors"
            >
              {authMode === 'login' ? 'Register now' : 'Sign in'}
            </button>
          </p>
        </div>

        <p className="mt-10 text-center text-[10px] text-white/20 uppercase tracking-[0.2em] font-bold">
          © 2026 OpenPost • API Powered by hyvercode
        </p>
      </motion.div>
    </div>
  );
}
