import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [roleTab, setRoleTab] = useState<'customer' | 'garage'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync role tab from URL search parameters if provided (e.g. ?role=garage)
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'garage') {
      setRoleTab('garage');
    } else if (roleParam === 'customer') {
      setRoleTab('customer');
    }
  }, [location.search]);

  const from = (location.state as any)?.from?.pathname || (roleTab === 'garage' ? '/owner' : '/');

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your registered email address and master password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-12 flex justify-center items-center min-h-[75vh]">
      <div className="card p-8 auth-card w-full max-w-md shadow-2xl relative border border-border">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="brand-dot"></span>
            <span className="font-extrabold text-xl text-white">MeriGarage</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {roleTab === 'customer' ? 'Customer Login' : 'Garage Login'}
          </h1>
          <p className="text-secondary text-xs mt-1">
            {roleTab === 'customer'
              ? 'Access verified reviews, bookmark garages, and track quotes.'
              : 'Manage workshop credentials, review responses, and photo galleries.'}
          </p>
        </div>

        {/* Customer Login vs Garage Login buttons styled like Navbar buttons */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRoleTab('customer')}
            className={`btn btn-sm flex-1 flex items-center justify-center gap-2 py-2.5 px-4 transition-all ${
              roleTab === 'customer'
                ? 'btn-primary shadow-lg'
                : 'btn-secondary border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-base">person</span>
            <span>Customer Login</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('garage')}
            className={`btn btn-sm flex-1 flex items-center justify-center gap-2 py-2.5 px-4 transition-all ${
              roleTab === 'garage'
                ? 'btn-primary shadow-lg'
                : 'btn-secondary border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-base">construction</span>
            <span>Garage Login</span>
          </button>
        </div>

        {errorMessage && (
          <Alert
            type="error"
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
            className="mb-4"
          />
        )}

        {/* Google OAuth Embed */}
        <div className="google-auth-wrapper mb-6">
          <GoogleAuthButton
            mode="signin"
            roleTab={roleTab}
            onSuccess={() => {
              navigate(from, { replace: true });
            }}
            onError={(err) => setErrorMessage(err)}
            disabled={submitting}
          />
        </div>

        <div className="auth-divider my-6">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">OR CONTINUE WITH PASSWORD</span>
          <span className="auth-divider-line"></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              {roleTab === 'customer' ? 'Email Address *' : 'Registered Business Email *'}
            </label>
            <div className="relative">
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                placeholder={roleTab === 'customer' ? 'user@example.com' : 'owner@workshop.com'}
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <div className="flex-between items-center mb-1">
              <label className="form-label mb-0" htmlFor="login-password">
                Password *
              </label>
            </div>
            <div className="relative flex items-center">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="form-control pr-10"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 text-secondary hover:text-primary transition-colors focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
            disabled={submitting}
          >
            <span className="material-symbols-outlined text-base">
              {roleTab === 'garage' ? 'construction' : 'login'}
            </span>
            <span>
              {submitting
                ? 'Authenticating...'
                : roleTab === 'garage'
                ? 'Access Owner Hub'
                : 'Sign In to MeriGarage'}
            </span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-secondary">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary font-bold hover:underline ml-1">
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
};
