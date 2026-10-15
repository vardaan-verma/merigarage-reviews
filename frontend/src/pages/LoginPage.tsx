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

  const from = (location.state as any)?.from?.pathname || (roleTab === 'garage' ? '/owner' : '/profile');

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
            <span className="text-primary font-bold text-xl">Reviews</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white">
            {roleTab === 'customer' ? 'Motorist Sign In' : 'Garage Owner Sign In'}
          </h1>
          <p className="text-secondary text-xs mt-1">
            {roleTab === 'customer'
              ? 'Access verified reviews, bookmark garages, and track claims.'
              : 'Manage workshop credentials, review responses, and photo galleries.'}
          </p>
        </div>

        {/* Role Segmented Switch Tab (Customer vs Garage) */}
        <div className="flex bg-[#141313] p-1 rounded-full border border-border mb-6">
          <button
            type="button"
            onClick={() => setRoleTab('customer')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              roleTab === 'customer'
                ? 'bg-primary text-white shadow-md'
                : 'text-secondary hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">directions_car</span>
            Motorist
          </button>
          <button
            type="button"
            onClick={() => setRoleTab('garage')}
            className={`flex-1 py-2 px-3 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
              roleTab === 'garage'
                ? 'bg-primary text-white shadow-md'
                : 'text-secondary hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">construction</span>
            Workshop Hub
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
        <div className="mb-5">
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

        <div className="auth-divider mb-5">
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
                  {showPassword ? 'visibility_off' : 'build'}
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
              {roleTab === 'garage' ? 'build' : 'login'}
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
