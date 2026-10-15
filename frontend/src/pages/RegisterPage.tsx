import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';
import { GoogleAuthButton } from '../components/GoogleAuthButton';

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/profile', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phoneNumber: phone.trim() || undefined,
      });
      navigate('/profile');
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Please verify your details.');
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
          <h1 className="text-2xl font-extrabold text-white">Create Account</h1>
          <p className="text-secondary text-xs mt-1">
            Join MeriGarage to write verified motorist reviews or manage your auto workshop.
          </p>
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
            mode="signup"
            onSuccess={() => {
              navigate('/profile', { replace: true });
            }}
            onError={(err) => setErrorMessage(err)}
            disabled={submitting}
          />
        </div>

        <div className="auth-divider mb-5">
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
