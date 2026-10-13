import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api';
import {
  Car,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  Shield,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  ExternalLink,
  RefreshCw
} from 'lucide-react';

export function LoginPage({ onLoginSuccess }) {
  const { login, register } = useAuth();

  // Active view: 'login' | 'register' | 'forgot' | 'reset'
  const [view, setView] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/reset-password/')) return 'reset';
    if (path === '/forgot-password') return 'forgot';
    if (path === '/register') return 'register';
    return 'login';
  });

  // Extract reset token from URL path if present
  const [resetToken, setResetToken] = useState(() => {
    const match = window.location.pathname.match(/\/reset-password\/([a-zA-Z0-9_-]+)/);
    return match ? match[1] : '';
  });

  // Sync browser URL with view without full reload
  const navigateView = (newView, token = '') => {
    setView(newView);
    setGlobalError('');
    setFieldErrors({});

    let newUrl = '/login';
    if (newView === 'register') newUrl = '/register';
    if (newView === 'forgot') newUrl = '/forgot-password';
    if (newView === 'reset') {
      newUrl = token ? `/reset-password/${token}` : '/reset-password';
      if (token) setResetToken(token);
    }

    try {
      window.history.pushState({}, '', newUrl);
    } catch (e) {
      // Non-fatal if history push fails in constrained env
    }
  };

  // Listen to popstate (browser back/forward button)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const match = path.match(/\/reset-password\/([a-zA-Z0-9_-]+)/);
      if (match) {
        setResetToken(match[1]);
        setView('reset');
      } else if (path === '/forgot-password') {
        setView('forgot');
      } else if (path === '/register') {
        setView('register');
      } else {
        setView('login');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Shared state
  const [globalError, setGlobalError] = useState('');
  const [globalSuccess, setGlobalSuccess] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loading, setLoading] = useState(false);

  // =========================================================================
  // 1. LOGIN FORM STATE (Must be initially empty, NO pre-filling)
  // =========================================================================
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // =========================================================================
  // 2. REGISTER FORM STATE
  // =========================================================================
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regRole, setRegRole] = useState('CUSTOMER');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // =========================================================================
  // 3. FORGOT PASSWORD STATE
  // =========================================================================
  const [forgotEmail, setForgotEmail] = useState('');
  const [devResetUrl, setDevResetUrl] = useState('');
  const [devResetToken, setDevResetToken] = useState('');

  // =========================================================================
  // 4. RESET PASSWORD STATE
  // =========================================================================
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [tokenValidating, setTokenValidating] = useState(false);
  const [tokenInvalid, setTokenInvalid] = useState(false);

  // Password requirements calculation helper
  const checkPasswordStrength = (pwd) => ({
    hasLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd)
  });

  const regPwdChecks = checkPasswordStrength(regPassword);
  const resetPwdChecks = checkPasswordStrength(resetNewPassword);

  // Validate reset token on load when view is 'reset'
  useEffect(() => {
    if (view === 'reset') {
      if (!resetToken) {
        setTokenInvalid(true);
        setGlobalError('This password reset link is invalid or has expired.');
        return;
      }
      setTokenValidating(true);
      setTokenInvalid(false);
      api.verifyResetToken(resetToken)
        .then(() => {
          setTokenInvalid(false);
          setGlobalError('');
        })
        .catch((err) => {
          setTokenInvalid(true);
          setGlobalError(err.message || 'This password reset link is invalid or has expired.');
        })
        .finally(() => {
          setTokenValidating(false);
        });
    }
  }, [view, resetToken]);

  // =========================================================================
  // HANDLER: LOGIN SUBMISSION
  // =========================================================================
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    const errors = {};

    const cleanId = loginIdentifier.trim();
    if (!cleanId && !loginPassword) {
      setGlobalError('Please enter your username/email and password.');
      setFieldErrors({
        identifier: 'Please enter your username or email.',
        password: 'Please enter your password.'
      });
      return;
    }

    if (!cleanId) {
      errors.identifier = 'Please enter your username or email.';
    } else if (cleanId.includes('@') && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanId)) {
      errors.identifier = 'Please enter a valid email address.';
    }

    if (!loginPassword) {
      errors.password = 'Please enter your password.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await login(cleanId, loginPassword, rememberMe);
      if (onLoginSuccess && res?.user) {
        onLoginSuccess(res.user);
      }
    } catch (err) {
      // Clear password field on error
      setLoginPassword('');
      const msg = err.message || 'Invalid username or password.';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || err.status === 500) {
        setGlobalError('Unable to connect to the server. Please try again.');
      } else {
        setGlobalError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: CUSTOMER REGISTRATION
  // =========================================================================
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    const errors = {};

    if (!regFullName.trim()) {
      errors.fullName = 'Please enter your full name.';
    }

    const cleanEmail = regEmail.trim();
    if (!cleanEmail) {
      errors.email = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!regPassword) {
      errors.password = 'Please enter your password.';
    } else if (!regPwdChecks.hasLength || !regPwdChecks.hasUpper || !regPwdChecks.hasLower || !regPwdChecks.hasNumber) {
      errors.password = 'Password does not meet the security requirements.';
    }

    if (regPassword !== regConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await register({
        full_name: regFullName.trim(),
        email: cleanEmail,
        phone: regPhone.trim(),
        role: regRole,
        password: regPassword,
        confirm_password: regConfirmPassword
      });

      // Clear all fields
      setRegFullName('');
      setRegEmail('');
      setRegPhone('');
      setRegPassword('');
      setRegConfirmPassword('');

      // Auto-login into app immediately upon successful account creation
      if (onLoginSuccess && res?.user) {
        onLoginSuccess(res.user);
      } else {
        navigateView('login');
        setLoginIdentifier(cleanEmail);
        setGlobalSuccess(res?.message || 'Account created successfully. Please log in.');
      }
    } catch (err) {
      const msg = err.message || 'Registration failed. Please check your details.';
      setGlobalError(msg);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: FORGOT PASSWORD REQUEST
  // =========================================================================
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    setDevResetUrl('');
    setDevResetToken('');

    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setFieldErrors({ email: 'Please enter your registered email address.' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setFieldErrors({ email: 'Please enter a valid email address.' });
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.forgotPassword(cleanEmail);
      setGlobalSuccess(res.message || 'If an account exists with this email, a password reset link has been sent.');
      if (res.devResetLink) {
        setDevResetUrl(res.devResetLink);
        setDevResetToken(res.devToken || '');
      }
    } catch (err) {
      setGlobalError(err.message || 'Unable to process password reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // HANDLER: RESET PASSWORD EXECUTION
  // =========================================================================
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');
    setGlobalSuccess('');
    const errors = {};

    if (!resetNewPassword) {
      errors.password = 'Please enter your new password.';
    } else if (!resetPwdChecks.hasLength || !resetPwdChecks.hasUpper || !resetPwdChecks.hasLower || !resetPwdChecks.hasNumber) {
      errors.password = 'Password does not meet the security requirements.';
    }

    if (resetNewPassword !== resetConfirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    try {
      const res = await api.resetPassword({
        token: resetToken,
        new_password: resetNewPassword,
        confirm_password: resetConfirmPassword
      });

      setGlobalSuccess(res.message || 'Your password has been changed successfully. Please log in.');
      setResetNewPassword('');
      setResetConfirmPassword('');
    } catch (err) {
      setGlobalError(err.message || 'This password reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100vw',
        display: 'flex',
        alignItems: 'stretch',
        background: '#090d16',
        color: '#f8fafc',
        fontFamily: 'var(--font-sans, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif)',
        overflowX: 'hidden'
      }}
    >
      {/* ================================================================= */}
      {/* Left Pane: Enterprise Vehicle Rental Showcase Pane               */}
      {/* ================================================================= */}
      <div
        style={{
          flex: '1.1',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '3.5rem',
          background: 'linear-gradient(145deg, #0b1329 0%, #060913 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.08)',
          overflow: 'hidden'
        }}
        className="login-showcase-pane"
      >
        {/* Ambient Decorative Lighting */}
        <div
          style={{
            position: 'absolute',
            top: '-20%',
            left: '-10%',
            width: '600px',
            height: '600px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37, 99, 235, 0.18) 0%, rgba(0,0,0,0) 70%)',
            pointerEvents: 'none'
          }}
        />

        {/* Top Branding */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
              }}
            >
              <Car size={26} />
            </div>
            <div>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
                RentDrive<span style={{ color: '#38bdf8' }}>.</span>
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: '#94a3b8',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  marginTop: 2
                }}
              >
                Vehicle Rental Management System
              </div>
            </div>
          </div>
        </div>

        {/* Center Hero Content */}
        <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '3rem 0' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.4rem 0.85rem',
              borderRadius: 30,
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '1.5rem',
              letterSpacing: '0.04em'
            }}
          >
            <Sparkles size={14} /> RELATIONAL DBMS ARCHITECTURE
          </div>

          <h1
            style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
              color: '#ffffff',
              marginBottom: '1.25rem'
            }}
          >
            Commercial Fleet Management System
          </h1>

          <p style={{ fontSize: '0.98rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2.25rem' }}>
            Production-grade vehicle operations with mathematical interval collision checks, automated condition settlements,
            and strict database role governance.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
            <div
              style={{
                padding: '1rem',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#38bdf8', fontWeight: 700, fontSize: '0.88rem' }}>
                <Shield size={16} /> Real DB Authentication
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                Bcrypt password verification with account lockout protection.
              </div>
            </div>

            <div
              style={{
                padding: '1rem',
                borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.07)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#34d399', fontWeight: 700, fontSize: '0.88rem' }}>
                <KeyRound size={16} /> Role Authorization
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.35rem' }}>
                Server-determined access rights for Admin, Staff, and Customer.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Platform Guarantee */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '1.5rem',
            fontSize: '0.76rem',
            color: '#64748b'
          }}
        >
          <span>15 Relational Entities • Strict Referential Integrity</span>
          <span>Version 2.0 Enterprise</span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* Right Pane: Authentication Container                              */}
      {/* ================================================================= */}
      <div
        style={{
          flex: '0.9',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '2.5rem',
          background: '#090d16',
          position: 'relative'
        }}
      >
        <div style={{ width: '100%', maxWidth: 430 }}>
          {/* Header Section */}
          <div style={{ marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 4 }}>
              RentDrive
            </div>
            <h2 style={{ fontSize: '1.85rem', fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff', margin: 0 }}>
              {view === 'login' && 'Welcome Back'}
              {view === 'register' && (regRole === 'STAFF' ? 'Create Staff Account' : regRole === 'ADMIN' ? 'Create Admin Account' : 'Create Customer Account')}
              {view === 'forgot' && 'Forgot Password'}
              {view === 'reset' && 'Reset Password'}
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', marginTop: '0.4rem', marginBottom: 0 }}>
              {view === 'login' && 'Sign in to continue'}
              {view === 'register' && (regRole === 'STAFF' ? 'Register as operations & fleet desk staff' : regRole === 'ADMIN' ? 'Register with administrator access' : 'Register as a verified renter for self-drive commercial bookings')}
              {view === 'forgot' && 'Enter your registered email address to receive password reset instructions'}
              {view === 'reset' && 'Create a new secure password for your account'}
            </p>
          </div>

          {/* Global Success Banner */}
          {globalSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: '#34d399',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                lineHeight: 1.4
              }}
            >
              <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>{globalSuccess}</div>
            </div>
          )}

          {/* Global Error Banner */}
          {globalError && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                padding: '0.85rem 1rem',
                borderRadius: 10,
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#f87171',
                fontSize: '0.85rem',
                marginBottom: '1.5rem',
                lineHeight: 1.4
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{globalError}</div>
              </div>
              {view === 'register' && globalError.toLowerCase().includes('already exists') && (
                <button
                  type="button"
                  onClick={() => {
                    const emailToUse = regEmail.trim();
                    navigateView('login');
                    if (emailToUse) setLoginIdentifier(emailToUse);
                  }}
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '0.25rem',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 6,
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Sign In with this email →
                </button>
              )}
            </div>
          )}

          {/* =============================================================== */}
          {/* VIEW 1: LOGIN FORM                                              */}
          {/* =============================================================== */}
          {view === 'login' && (
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label
                  htmlFor="login-identifier"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.45rem' }}
                >
                  Username or Email
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Mail size={17} />
                  </div>
                  <input
                    id="login-identifier"
                    type="text"
                    placeholder="Enter your username or email"
                    value={loginIdentifier}
                    onChange={(e) => {
                      setLoginIdentifier(e.target.value);
                      if (fieldErrors.identifier) {
                        setFieldErrors({ ...fieldErrors, identifier: null });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.identifier ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  />
                </div>
                {fieldErrors.identifier && (
                  <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem', fontWeight: 500 }}>
                    {fieldErrors.identifier}
                  </div>
                )}
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
                  <label
                    htmlFor="login-password"
                    style={{ fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1' }}
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => navigateView('forgot')}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    Forgot Password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Lock size={17} />
                  </div>
                  <input
                    id="login-password"
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Enter password"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors({ ...fieldErrors, password: null });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    style={{
                      position: 'absolute',
                      right: '0.85rem',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    {showLoginPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem', fontWeight: 500 }}>
                    {fieldErrors.password}
                  </div>
                )}
              </div>

              {/* Remember Me Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <input
                  type="checkbox"
                  id="remember-me"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb', cursor: 'pointer', borderRadius: 4 }}
                />
                <label htmlFor="remember-me" style={{ fontSize: '0.82rem', color: '#94a3b8', cursor: 'pointer', userSelect: 'none' }}>
                  Remember me
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 10,
                  background: loading ? 'rgba(37, 99, 235, 0.5)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  marginTop: '0.4rem',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {loading ? 'Signing in...' : 'SIGN IN'}
              </button>

              {/* Link to Registration */}
              <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigateView('register')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#38bdf8',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0
                  }}
                >
                  Create Account
                </button>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* VIEW 2: REGISTRATION FORM                                        */}
          {/* =============================================================== */}
          {view === 'register' && (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 6 }}>
                  Account Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[
                    { id: 'CUSTOMER', label: 'Customer' },
                    { id: 'STAFF', label: 'Staff' },
                    { id: 'ADMIN', label: 'Admin' }
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRegRole(r.id)}
                      style={{
                        padding: '0.5rem 0.25rem',
                        borderRadius: 8,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        border: regRole === r.id ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.12)',
                        background: regRole === r.id ? 'rgba(56, 189, 248, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                        color: regRole === r.id ? '#38bdf8' : '#94a3b8',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                  Full Name *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. Rohan Sharma"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.fullName ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {fieldErrors.fullName && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 3 }}>{fieldErrors.fullName}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                  Email Address *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Mail size={16} />
                  </div>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.email ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {fieldErrors.email && <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 3 }}>{fieldErrors.email}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                  Phone Number
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Phone size={16} />
                  </div>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.4rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                  Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Enter strong password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    {showRegPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password Requirements Checklist */}
                <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.65rem', borderRadius: 6, marginTop: 6, fontSize: '0.72rem', color: '#94a3b8' }}>
                  <div style={{ fontWeight: 600, marginBottom: 3 }}>Password must contain:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                    <span style={{ color: regPwdChecks.hasLength ? '#34d399' : '#64748b' }}>
                      {regPwdChecks.hasLength ? '✓' : '○'} At least 8 characters
                    </span>
                    <span style={{ color: regPwdChecks.hasUpper ? '#34d399' : '#64748b' }}>
                      {regPwdChecks.hasUpper ? '✓' : '○'} One uppercase letter
                    </span>
                    <span style={{ color: regPwdChecks.hasLower ? '#34d399' : '#64748b' }}>
                      {regPwdChecks.hasLower ? '✓' : '○'} One lowercase letter
                    </span>
                    <span style={{ color: regPwdChecks.hasNumber ? '#34d399' : '#64748b' }}>
                      {regPwdChecks.hasNumber ? '✓' : '○'} One number
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: 4 }}>
                  Confirm Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Lock size={16} />
                  </div>
                  <input
                    type={showRegConfirmPassword ? 'text' : 'password'}
                    placeholder="Re-enter password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.4rem 0.65rem 2.4rem',
                      borderRadius: 8,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                    style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                  >
                    {showRegConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldErrors.confirmPassword && (
                  <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: 3 }}>{fieldErrors.confirmPassword}</div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Creating Account & Signing In...' : 'CREATE ACCOUNT & SIGN IN'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.85rem', color: '#94a3b8' }}>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => navigateView('login')}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                >
                  Login
                </button>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* VIEW 3: FORGOT PASSWORD                                         */}
          {/* =============================================================== */}
          {view === 'forgot' && (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.45rem' }}>
                  Registered Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                    <Mail size={17} />
                  </div>
                  <input
                    type="email"
                    placeholder="user@example.com"
                    value={forgotEmail}
                    onChange={(e) => {
                      setForgotEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors({});
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem 0.85rem 0.75rem 2.6rem',
                      borderRadius: 10,
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: fieldErrors.email ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#ffffff',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                </div>
                {fieldErrors.email && <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem' }}>{fieldErrors.email}</div>}
              </div>

              {/* Development helper banner when reset link is generated (Point 12) */}
              {devResetUrl && (
                <div
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: 10,
                    padding: '0.85rem 1rem'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38bdf8', marginBottom: 4 }}>
                    Development Environment Reset Link
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.75rem' }}>
                    Click below to open the password reset page for this token:
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateView('reset', devResetToken)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                      padding: '0.45rem 0.85rem',
                      borderRadius: 6,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    <span>Proceed to Reset Password</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.85rem',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#ffffff',
                  fontSize: '0.92rem',
                  fontWeight: 700,
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                {loading ? 'Sending Request...' : 'SEND RESET LINK'}
              </button>

              <div style={{ textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigateView('login')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}
                >
                  <ArrowLeft size={15} /> Back to Login
                </button>
              </div>
            </form>
          )}

          {/* =============================================================== */}
          {/* VIEW 4: RESET PASSWORD                                          */}
          {/* =============================================================== */}
          {view === 'reset' && (
            <div>
              {tokenValidating ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  <div style={{ width: 28, height: 28, border: '2px solid rgba(255, 255, 255, 0.2)', borderTopColor: '#38bdf8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 0.75rem auto' }} />
                  <span>Validating Reset Token...</span>
                </div>
              ) : tokenInvalid ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <button
                    type="button"
                    onClick={() => navigateView('forgot')}
                    style={{
                      padding: '0.75rem 1.25rem',
                      borderRadius: 8,
                      background: '#2563eb',
                      color: '#ffffff',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    REQUEST NEW RESET LINK
                  </button>
                  <div style={{ marginTop: '1rem' }}>
                    <button
                      type="button"
                      onClick={() => navigateView('login')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Back to Login
                    </button>
                  </div>
                </div>
              ) : globalSuccess ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <button
                    type="button"
                    onClick={() => navigateView('login')}
                    style={{
                      padding: '0.85rem 1.5rem',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    BACK TO LOGIN
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.45rem' }}>
                      New Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                        <Lock size={17} />
                      </div>
                      <input
                        type={showResetPassword ? 'text' : 'password'}
                        placeholder="Enter new password"
                        value={resetNewPassword}
                        onChange={(e) => setResetNewPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: fieldErrors.password ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPassword(!showResetPassword)}
                        style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        {showResetPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>

                    {/* Requirements indicator */}
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '0.5rem 0.65rem', borderRadius: 6, marginTop: 6, fontSize: '0.72rem', color: '#94a3b8' }}>
                      <div style={{ fontWeight: 600, marginBottom: 3 }}>Password must contain:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 8px' }}>
                        <span style={{ color: resetPwdChecks.hasLength ? '#34d399' : '#64748b' }}>
                          {resetPwdChecks.hasLength ? '✓' : '○'} At least 8 characters
                        </span>
                        <span style={{ color: resetPwdChecks.hasUpper ? '#34d399' : '#64748b' }}>
                          {resetPwdChecks.hasUpper ? '✓' : '○'} One uppercase letter
                        </span>
                        <span style={{ color: resetPwdChecks.hasLower ? '#34d399' : '#64748b' }}>
                          {resetPwdChecks.hasLower ? '✓' : '○'} One lowercase letter
                        </span>
                        <span style={{ color: resetPwdChecks.hasNumber ? '#34d399' : '#64748b' }}>
                          {resetPwdChecks.hasNumber ? '✓' : '○'} One number
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.45rem' }}>
                      Confirm New Password *
                    </label>
                    <div style={{ position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }}>
                        <Lock size={17} />
                      </div>
                      <input
                        type={showResetConfirmPassword ? 'text' : 'password'}
                        placeholder="Re-enter new password"
                        value={resetConfirmPassword}
                        onChange={(e) => setResetConfirmPassword(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 2.6rem 0.75rem 2.6rem',
                          borderRadius: 10,
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: fieldErrors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                          color: '#ffffff',
                          fontSize: '0.9rem',
                          outline: 'none'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        style={{ position: 'absolute', right: '0.85rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0 }}
                      >
                        {showResetConfirmPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                      </button>
                    </div>
                    {fieldErrors.confirmPassword && (
                      <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '0.35rem' }}>{fieldErrors.confirmPassword}</div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '0.85rem',
                      borderRadius: 10,
                      background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                      color: '#ffffff',
                      fontSize: '0.92rem',
                      fontWeight: 700,
                      border: 'none',
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {loading ? 'Updating Password...' : 'RESET PASSWORD'}
                  </button>

                  <div style={{ textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => navigateView('login')}
                      style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '0.85rem', cursor: 'pointer' }}
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* Security Notice */}
          <div
            style={{
              marginTop: '2.5rem',
              paddingTop: '1.25rem',
              borderTop: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              color: '#64748b',
              fontSize: '0.75rem'
            }}
          >
            <Shield size={14} color="#3b82f6" />
            <span>Encrypted Session • Passwords securely hashed with bcrypt</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        @media (max-width: 900px) {
          .login-showcase-pane {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
