import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Smartphone, Mail, ArrowRight, UserCheck, X, Eye, EyeOff, KeyRound } from 'lucide-react';
import { UserAccount, UserRole } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  initialRole?: 'ADMIN' | 'CUSTOMER' | null;
  onClose: () => void;
  onAuthSuccess: (user: UserAccount, token: string) => void;
  onShowToast: (type: 'success' | 'warning' | 'error' | 'info', title: string, msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  initialRole,
  onClose,
  onAuthSuccess,
  onShowToast,
}) => {
  const [mode, setMode] = useState<'LOGIN' | 'REGISTER' | '2FA_CHALLENGE'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // 2FA Challenge state
  const [challengeToken, setChallengeToken] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Reset or switch to login mode when modal opens
  useEffect(() => {
    if (isOpen) {
      if (initialRole === 'ADMIN') {
        setMode('LOGIN');
      }
    }
  }, [isOpen, initialRole]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      onShowToast('error', 'Required Field', 'Please enter your account email.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.requires2FA) {
        setChallengeToken(data.challengeToken);
        setMaskedPhone(data.userPhone ? `+233 ${data.userPhone.slice(-6)}` : 'your mobile');
        if (data.debugOtpHint) {
          setTwoFactorCode(data.debugOtpHint);
        }
        setMode('2FA_CHALLENGE');
        onShowToast(
          'info',
          'Mandatory 2FA Triggered',
          `SMS verification code dispatched to ${data.userPhone ? `+233 ${data.userPhone.slice(-6)}` : 'your mobile'}.`
        );
      }
    } catch (err: any) {
      onShowToast('error', 'Login Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2fa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorCode || twoFactorCode.length < 4) {
      onShowToast('error', 'Invalid Code', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeToken,
          code: twoFactorCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '2FA verification rejected.');
      }

      onShowToast(
        'success',
        '2FA Verified Successfully',
        `Authenticated as ${data.user.fullName} (${data.user.role})`
      );
      onAuthSuccess(data.user, data.token);
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Verification Failed', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !fullName || !phone || !password) {
      onShowToast('error', 'Missing Information', 'Please complete all required fields including password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          phone,
          role: 'CUSTOMER',
          password,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      onShowToast('success', 'Account Registered', 'Please sign in to complete initial 2FA verification.');
      setEmail(email);
      setMode('LOGIN');
    } catch (err: any) {
      onShowToast('error', 'Registration Error', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="auth-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
    >
      <div
        id="auth-modal-card"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 dark:border-slate-800 transition-colors"
      >
        {/* Modal Top Header */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400/20 text-amber-400 flex items-center justify-center border border-amber-400/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base font-['Outfit',sans-serif]">
                {mode === '2FA_CHALLENGE'
                  ? 'Mandatory 2FA Verification'
                  : mode === 'REGISTER'
                  ? 'Create Ghana Telecom Account'
                  : 'Account Authentication'}
              </h2>
              <p className="text-[11px] text-slate-400">SOC2 & GDPR Multi-Factor Security</p>
            </div>
          </div>
          <button
            id="close-auth-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Mode Tabs */}
          {mode !== '2FA_CHALLENGE' && (
            <div className="flex border-b border-slate-200 dark:border-slate-800 mb-5">
              <button
                type="button"
                id="tab-mode-login"
                onClick={() => setMode('LOGIN')}
                className={`pb-2.5 px-4 text-xs font-bold transition-colors relative cursor-pointer ${
                  mode === 'LOGIN'
                    ? 'text-slate-900 dark:text-amber-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Sign In
                {mode === 'LOGIN' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full"></span>
                )}
              </button>
              <button
                type="button"
                id="tab-mode-register"
                onClick={() => setMode('REGISTER')}
                className={`pb-2.5 px-4 text-xs font-bold transition-colors relative cursor-pointer ${
                  mode === 'REGISTER'
                    ? 'text-slate-900 dark:text-amber-400'
                    : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                Create Customer Account
                {mode === 'REGISTER' && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500 rounded-full"></span>
                )}
              </button>
            </div>
          )}

          {/* FORM: LOGIN */}
          {mode === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {initialRole === 'ADMIN' && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center gap-2.5 text-xs text-slate-200">
                  <div className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                    <KeyRound className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Administrator Access</p>
                    <p className="text-[11px] text-slate-400">Sign in with your authorized administrator credentials.</p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your account email"
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    id="toggle-login-password-btn"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/40 rounded-xl p-3 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>MFA Enforced:</strong> All accounts require instantaneous 2-Factor
                  Authentication OTP challenge before session initiation.
                </span>
              </div>

              <button
                type="submit"
                id="login-submit-btn"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Issuing 2FA Challenge...' : 'Continue to 2FA Verification'}
                <ArrowRight className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              </button>
            </form>
          )}

          {/* FORM: 2FA CHALLENGE */}
          {mode === '2FA_CHALLENGE' && (
            <form onSubmit={handleVerify2fa} className="space-y-4">
              <div className="text-center py-2">
                <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto mb-2 border border-amber-300 dark:border-amber-800">
                  <Smartphone className="w-6 h-6 animate-pulse" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Enter 6-Digit Code</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  A high-priority verification code was issued for <span className="font-semibold text-slate-700 dark:text-slate-300">{email}</span>.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">
                  Security Token / TOTP
                </label>
                <div className="relative max-w-[200px] mx-auto">
                  <input
                    id="two-factor-code-input"
                    type="text"
                    maxLength={6}
                    required
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full text-center tracking-[0.5em] text-xl font-mono font-bold py-2.5 bg-slate-50 dark:bg-slate-800 border-2 border-amber-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                id="verify-2fa-btn"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Verifying Credentials...' : 'Verify & Authorize Session'}
                <ShieldCheck className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="back-to-login-btn"
                onClick={() => setMode('LOGIN')}
                className="w-full text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 text-center block pt-2 cursor-pointer"
              >
                ← Back to Login
              </button>
            </form>
          )}

          {/* FORM: REGISTER */}
          {mode === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Kwame Mensah"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email</label>
                <input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@telecom.gh"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghana Phone (MoMo enabled)
                </label>
                <input
                  id="reg-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0244123456"
                  className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Account Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    id="reg-password"
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Set account password"
                    className="w-full pl-9 pr-10 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    id="toggle-reg-password-btn"
                    onClick={() => setShowRegisterPassword((prev) => !prev)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer p-0.5"
                    title={showRegisterPassword ? 'Hide password' : 'Show password'}
                    aria-label={showRegisterPassword ? 'Hide password' : 'Show password'}
                  >
                    {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400">
                <p className="font-semibold text-slate-900 dark:text-slate-100 mb-0.5">Need a Sub-Agent Account?</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Sub-Agent commission accounts are provisioned exclusively by the Platform Administrator with designated commission percentages.
                </p>
              </div>

              <button
                type="submit"
                id="reg-submit-btn"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-amber-400 dark:hover:bg-amber-300 text-white dark:text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? 'Creating Account...' : 'Register & Enable 2FA'}
                <UserCheck className="w-4 h-4 text-amber-400 dark:text-slate-950" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
