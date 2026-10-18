import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import {
  getPendingAction,
  isValidInternalReturnUrl,
  type PendingAction,
} from '../utils/pendingActionStorage';

export const LoginPage: React.FC = () => {
  const { user, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [roleTab, setRoleTab] = useState<'customer' | 'garage'>('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Sync role tab matching portal param or pending action
  React.useEffect(() => {
    const params = new URLSearchParams(location.search);
    const portalParam = params.get('portal') || params.get('role');
    const pending = (location.state?.pendingAction as PendingAction) || getPendingAction();

    if (pending?.portal === 'garage') {
      setRoleTab('garage');
    } else if (pending?.portal === 'customer') {
      setRoleTab('customer');
    } else if (portalParam === 'garage' || portalParam === 'garage_owner' || portalParam === 'owner') {
      setRoleTab('garage');
    } else if (portalParam === 'customer' || portalParam === 'vehicle_owner' || portalParam === 'user') {
      setRoleTab('customer');
    }
  }, [location.search, location.state]);

  // Sync email and success banner from registration redirect if available
  React.useEffect(() => {
    if (location.state?.registeredEmail && !email) {
      setEmail(location.state.registeredEmail);
    }
    if (location.state?.successMessage) {
      setSuccessNotice(location.state.successMessage);
    }
  }, [location.state]);

  const handleSwitchTab = (tab: 'customer' | 'garage') => {
    setRoleTab(tab);
    setErrorMessage(null);
    setPassword('');
  };

  /**
   * Resolves the target destination after successful login:
   * 1. Valid pending action returnUrl (restoring form context)
   * 2. Valid location.state.from internal path
   * 3. Role-based fallback: Garage Owner -> /owner, Vehicle Owner -> /
   */
  const resolvePostLoginDestination = React.useCallback(
    (loggedUser: any) => {
      const isGarage = loggedUser?.roles?.includes('ROLE_GARAGE_OWNER');
      const isAdmin = loggedUser?.roles?.includes('ROLE_ADMIN');

      const pending = (location.state?.pendingAction as PendingAction) || getPendingAction();
      if (pending && isValidInternalReturnUrl(pending.returnUrl)) {
        // Enforce role authorization if action was strictly for garage owners
        if (pending.portal === 'garage' && !isGarage && !isAdmin) {
          return { url: '/', state: undefined };
        }
        return {
          url: pending.returnUrl,
          state: { restoredAction: pending },
        };
      }

      if (location.state?.from) {
        const fromPath =
          typeof location.state.from === 'string'
            ? location.state.from
            : location.state.from.pathname + (location.state.from.search || '');
        if (isValidInternalReturnUrl(fromPath)) {
          return { url: fromPath, state: undefined };
        }
      }

      return {
        url: isGarage ? '/owner' : '/',
        state: undefined,
      };
    },
    [location.state]
  );

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated && user) {
      const dest = resolvePostLoginDestination(user);
      navigate(dest.url, { state: dest.state, replace: true });
    }
  }, [isAuthenticated, user, navigate, resolvePostLoginDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both your registered email address and master password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      setSuccessNotice(null);
      const loggedUser = await login(email.trim(), password, roleTab);
      const dest = resolvePostLoginDestination(loggedUser);
      navigate(dest.url, { state: dest.state, replace: true });
    } catch (err: any) {
      // Preserve the entered email/username, but never preserve or redisplay the password after an authentication failure
      setPassword('');
      setErrorMessage(err.message || 'Invalid email or password.');
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
            onClick={() => handleSwitchTab('customer')}
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
            onClick={() => handleSwitchTab('garage')}
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

        {successNotice && (
          <Alert
            type="success"
            message={successNotice}
            onClose={() => setSuccessNotice(null)}
            className="mb-4"
          />
        )}

        {errorMessage && (
          <div className="mb-4 space-y-2">
            <Alert
              type="error"
              message={errorMessage}
              onClose={() => setErrorMessage(null)}
            />
            {errorMessage.includes('Customer Portal') && roleTab === 'garage' && (
              <button
                type="button"
                onClick={() => handleSwitchTab('customer')}
                className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <span className="material-symbols-outlined text-base">person</span>
                <span>Switch to Customer Portal</span>
              </button>
            )}
            {errorMessage.includes('Garage Login') && roleTab === 'customer' && (
              <button
                type="button"
                onClick={() => handleSwitchTab('garage')}
                className="btn btn-primary btn-sm w-full flex items-center justify-center gap-1.5 py-2 text-xs"
              >
                <span className="material-symbols-outlined text-base">construction</span>
                <span>Switch to Garage Login</span>
              </button>
            )}
          </div>
        )}

        {/* Google OAuth Embed */}
        <div className="google-auth-wrapper mb-6">
          <GoogleAuthButton
            mode="signin"
            roleTab={roleTab}
            onSuccess={(loggedUser) => {
              const dest = resolvePostLoginDestination(loggedUser);
              navigate(dest.url, { state: dest.state, replace: true });
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
