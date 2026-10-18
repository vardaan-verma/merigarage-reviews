import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from '../components/GoogleAuthButton';
import { useToast } from '../context/NotificationContext';
import {
  safeTrackLeadEvent,
  getActiveSearchSession,
} from '../utils/searchSession';
import {
  getPendingAction,
  isValidInternalReturnUrl,
  type PendingAction,
} from '../utils/pendingActionStorage';

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showError, showWarning } = useToast();

  const [role, setRole] = useState<'ROLE_USER' | 'ROLE_GARAGE_OWNER'>('ROLE_USER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const resolveRegisterDestination = React.useCallback(() => {
    const pending = (location.state?.pendingAction as PendingAction) || getPendingAction();
    if (pending && isValidInternalReturnUrl(pending.returnUrl)) {
      return { url: pending.returnUrl, state: { restoredAction: pending } };
    }
    return { url: '/profile', state: undefined };
  }, [location.state]);

  // Sync role from query parameter if provided (?role=garage)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const roleParam = params.get('role');
    if (roleParam === 'garage' || roleParam === 'owner' || roleParam === 'ROLE_GARAGE_OWNER') {
      setRole('ROLE_GARAGE_OWNER');
    }
  }, [location.search]);

  // Track distinct event: Visitor begins sign-up
  useEffect(() => {
    const session = getActiveSearchSession();
    safeTrackLeadEvent('SIGNUP_STARTED', {
      source: session?.source || 'direct_signup',
      state: session?.state,
      city: session?.city,
      serviceSlug: session?.serviceSlug,
    });
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const dest = resolveRegisterDestination();
      navigate(dest.url, { state: dest.state, replace: true });
    }
  }, [isAuthenticated, navigate, resolveRegisterDestination]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      showWarning('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      showWarning('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      showWarning('Passwords do not match.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      showWarning('Please enter a valid 10-digit mobile number, or leave it blank.');
      return;
    }

    try {
      setSubmitting(true);

      const session = getActiveSearchSession();
      const registrationSource = session?.source || 'landing_page';
      const consentStatus = marketingConsent ? 'CONSENT_GRANTED' : 'CONSENT_WITHHELD';

      const createdUser = await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: cleanPhone || undefined,
        registrationSource,
        consentStatus,
        role,
      });

      // Track distinct event: User successfully registers
      await safeTrackLeadEvent('USER_REGISTERED', {
        source: registrationSource,
        state: session?.state,
        city: session?.city,
        serviceSlug: session?.serviceSlug,
        vehicleType: session?.vehicleType,
        vehicleMake: session?.vehicleMake,
        vehicleModel: session?.vehicleModel,
      });

      // Redirect directly to the appropriate sign-in page using backend-assigned role
      const isGarageRole = createdUser?.roles?.includes('ROLE_GARAGE_OWNER');
      const targetPortal = isGarageRole ? 'garage' : 'customer';
      const pending = (location.state?.pendingAction as PendingAction) || getPendingAction();

      navigate(`/login?portal=${targetPortal}&registered=true`, {
        replace: true,
        state: {
          registeredEmail: email.trim(),
          pendingAction: pending,
          successMessage: isGarageRole
            ? 'Registration successful! Please sign in with your Garage Owner credentials.'
            : 'Registration successful! Please sign in with your Vehicle Owner credentials.',
        },
      });
    } catch (err: any) {
      showError(err.message || 'Registration failed. Please verify your details.');
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
          <h1 className="text-2xl font-extrabold text-white">Create Account</h1>
          <p className="text-secondary text-xs mt-1">
            {role === 'ROLE_USER'
              ? 'Join as a Vehicle Owner to track service history, write reviews, and request quotes.'
              : 'Join as a Garage Owner to list workshops, manage quotes, and verify ownership.'}
          </p>
        </div>

        {/* Role Selector: Vehicle Owner vs Garage Owner */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('ROLE_USER')}
            className={`btn btn-sm flex-1 flex items-center justify-center gap-2 py-2.5 px-4 transition-all ${
              role === 'ROLE_USER'
                ? 'btn-primary shadow-lg'
                : 'btn-secondary border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-base">directions_car</span>
            <span>Vehicle Owner</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('ROLE_GARAGE_OWNER')}
            className={`btn btn-sm flex-1 flex items-center justify-center gap-2 py-2.5 px-4 transition-all ${
              role === 'ROLE_GARAGE_OWNER'
                ? 'btn-primary shadow-lg'
                : 'btn-secondary border border-border'
            }`}
          >
            <span className="material-symbols-outlined text-base">construction</span>
            <span>Garage Owner</span>
          </button>
        </div>

        {/* Google OAuth Embed */}
        <div className="google-auth-wrapper mb-6">
          <GoogleAuthButton
            mode="signup"
            roleTab={role === 'ROLE_GARAGE_OWNER' ? 'garage' : 'customer'}
            role={role}
            onSuccess={() => {
              const dest = resolveRegisterDestination();
              navigate(dest.url, { state: dest.state, replace: true });
            }}
            onError={(err) => showError(err)}
            disabled={submitting}
          />
        </div>

        <div className="auth-divider my-6">
          <span className="auth-divider-line"></span>
          <span className="auth-divider-text">OR REGISTER WITH EMAIL</span>
          <span className="auth-divider-line"></span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-group">
            <label className="form-label" htmlFor="reg-name">
              Full Name *
            </label>
            <input
              id="reg-name"
              type="text"
              required
              placeholder="e.g. Rahul Sharma"
              className="form-control"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-email">
              Email Address *
            </label>
            <input
              id="reg-email"
              type="email"
              required
              autoComplete="email"
              placeholder="rahul@example.com"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-phone">
              Mobile Number (Optional)
            </label>
            <input
              id="reg-phone"
              type="tel"
              placeholder="+91 9876543210"
              className="form-control font-mono"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="privacy-field-notice" style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: '0.35rem', lineHeight: '1.2' }}>
              🔒 Used strictly for quote notifications and account verification. Never publicly visible or sold.
            </p>
          </div>

          <div className="form-group">
            <div className="flex-between items-center mb-1">
              <label className="form-label mb-0" htmlFor="reg-password">
                Password * (min. 8 characters)
              </label>
              <button
                type="button"
                className="text-xs text-secondary hover:text-primary transition-colors focus:outline-none"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-confirm">
              Confirm Password *
            </label>
            <input
              id="reg-confirm"
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              placeholder="••••••••••••"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <div className="form-group pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-secondary leading-tight">
              <input
                type="checkbox"
                checked={marketingConsent}
                onChange={(e) => setMarketingConsent(e.target.checked)}
                className="mt-0.5 rounded border-border text-primary focus:ring-0"
              />
              <span>
                (Optional) Keep me informed about seasonal car care tips, exclusive service discounts, and platform announcements.
              </span>
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-4 flex items-center justify-center gap-2"
            disabled={submitting}
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            <span>{submitting ? 'Creating Account...' : 'Register Account'}</span>
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-border text-center text-xs text-secondary">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-bold hover:underline ml-1">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
