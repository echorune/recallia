import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  Lock, Mail, User, Eye, EyeOff, Sparkles, CheckCircle2, 
  AlertCircle, ArrowRight, KeyRound, Shield, BrainCircuit, RefreshCw 
} from 'lucide-react';

type AuthMode = 'login' | 'register' | 'forgot' | 'reset';

export const AuthPage: React.FC = () => {
  const { login, register, requestPasswordReset, resetPassword, error, clearError } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localMessage, setLocalMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    clearError();
    setLocalMessage(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      // Error is set in AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setLocalMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setLocalMessage(null);
    try {
      await register(name, email, password);
    } catch (err) {
      // Error handled by AuthContext
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsSubmitting(true);
    clearError();
    setLocalMessage(null);
    try {
      await login('student@recallia.app', 'Recallia2026!');
    } catch (err) {
      setLocalMessage({ text: 'Demo account not initialized. Please run db seed.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubmitting(true);
    setLocalMessage(null);
    try {
      const res = await requestPasswordReset(email);
      if (res.resetToken) {
        setResetToken(res.resetToken);
        setLocalMessage({
          text: `Reset token generated: ${res.resetToken}. You can now proceed to set a new password.`,
          type: 'success',
        });
        setMode('reset');
      } else {
        setLocalMessage({
          text: 'If an account exists for this email, reset instructions have been recorded.',
          type: 'info',
        });
      }
    } catch (err: any) {
      setLocalMessage({ text: err.message || 'Reset request failed.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken || !password) return;
    if (password !== confirmPassword) {
      setLocalMessage({ text: 'Passwords do not match.', type: 'error' });
      return;
    }
    setIsSubmitting(true);
    setLocalMessage(null);
    try {
      await resetPassword(resetToken, password);
      setLocalMessage({
        text: 'Password successfully updated! Please log in with your new password.',
        type: 'success',
      });
      setMode('login');
      setPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setLocalMessage({ text: err.message || 'Failed to update password.', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-12 rounded-3xl overflow-hidden shadow-elevated bg-white border border-slate-200">
        
        {/* Left Branding Panel (Tropical Gradient) */}
        <div className="lg:col-span-5 gradient-tropical p-8 sm:p-10 text-white flex flex-col justify-between relative overflow-hidden">
          {/* Subtle decorative circles */}
          <div className="absolute -top-16 -right-16 w-52 h-52 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-brand-emerald/30 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <div className="inline-flex items-center space-x-2 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-semibold tracking-wide text-brand-sand mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Spaced-Repetition Engine</span>
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Recallia
            </h1>
            <p className="mt-2 text-brand-sand font-medium text-lg">
              Learn it. Recall it. Remember it.
            </p>
            <p className="mt-4 text-sm text-slate-100/90 leading-relaxed">
              Master complex subjects permanently. Built on the SuperMemo SM-2 algorithm to optimize your memory retention curve with zero wasted effort.
            </p>
          </div>

          <div className="relative z-10 mt-8 pt-8 border-t border-white/20 space-y-4">
            <div className="flex items-start space-x-3">
              <BrainCircuit className="w-5 h-5 text-brand-sand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Intelligent Scheduling</h4>
                <p className="text-xs text-slate-200">SM-2 adapts intervals dynamically to your personal recall speed.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Shield className="w-5 h-5 text-brand-sand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">Private Student Data</h4>
                <p className="text-xs text-slate-200">Secure salted scrypt encryption. Complete data ownership per student.</p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-brand-sand shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold">1,172 Science Questions</h4>
                <p className="text-xs text-slate-200">Structured across Biology, Physics, Earth Sciences, and Chemistry.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-center bg-white">
          
          {/* Tabs */}
          <div className="flex space-x-2 p-1.5 bg-slate-100 rounded-xl mb-8">
            <button
              onClick={() => switchMode('login')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'login'
                  ? 'bg-white text-brand-dark shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => switchMode('register')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'register'
                  ? 'bg-white text-brand-dark shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Create Account
            </button>
            <button
              onClick={() => switchMode('forgot')}
              className={`flex-1 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all ${
                mode === 'forgot' || mode === 'reset'
                  ? 'bg-white text-brand-dark shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Reset Key
            </button>
          </div>

          {/* Error & Message Alerts */}
          {(error || localMessage) && (
            <div
              className={`mb-6 p-4 rounded-xl flex items-start space-x-3 text-sm ${
                localMessage?.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : localMessage?.type === 'info'
                  ? 'bg-sky-50 text-sky-800 border border-sky-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}
            >
              {localMessage?.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600" />
              ) : (
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              )}
              <div className="flex-1 font-medium">{error || localMessage?.text}</div>
            </div>
          )}

          {/* Form: Sign In */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot')}
                    className="text-xs text-brand-teal hover:text-brand-dark font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition-all duration-200 flex items-center justify-center space-x-2 mt-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Recallia'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Demo Student Quick Login */}
              <div className="pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-xs text-brand-teal bg-brand-sage/20 hover:bg-brand-sage/30 transition-colors flex items-center justify-center space-x-2"
                >
                  <KeyRound className="w-4 h-4 text-brand-teal" />
                  <span>One-Click Demo Student Sign In (student@recallia.app)</span>
                </button>
              </div>
            </form>
          )}

          {/* Form: Register */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Alex Mercer"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Create Password (min. 8 characters with numbers & letters)
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-emerald hover:bg-teal-700 shadow-soft transition-all duration-200 flex items-center justify-center space-x-2 mt-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Creating Account...' : 'Register Student Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Form: Forgot Password */}
          {mode === 'forgot' && (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <p className="text-xs text-slate-600 mb-2">
                Enter your student email address to request a secure password reset token.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Student Email
                </label>
                <div className="relative">
                  <Mail className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-teal hover:bg-brand-navy shadow-soft transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Generating Token...' : 'Generate Reset Token'}</span>
                <KeyRound className="w-4 h-4" />
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-xs text-brand-teal font-medium hover:underline"
                >
                  Already have a reset token? Enter it here →
                </button>
              </div>
            </form>
          )}

          {/* Form: Reset Password Submission */}
          {mode === 'reset' && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <p className="text-xs text-slate-600 mb-2">
                Provide the password reset token and specify your new secure password.
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reset Token
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste 48-char reset token"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm font-mono text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-brand-teal focus:ring-2 focus:ring-brand-teal/20 outline-none transition text-sm text-slate-800"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 rounded-xl font-bold text-white bg-brand-emerald hover:bg-teal-700 shadow-soft transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Updating Password...' : 'Save New Password'}</span>
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
