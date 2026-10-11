import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';

export const RegisterPage: React.FC = () => {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
    <div className="container py-12 flex justify-center">
      <div className="card p-8 auth-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="brand-dot mx-auto mb-2 inline-block"></span>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-secondary text-xs mt-1">
            Join MeriGarage to write verified reviews, submit listings, or manage your workshop.
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
              placeholder="e.g. +91 9876543210"
              className="form-control"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="reg-password">
              Password * (min. 8 characters)
            </label>
            <input
              id="reg-password"
              type="password"
              required
              autoComplete="new-password"
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
              type="password"
              required
              autoComplete="new-password"
              className="form-control"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-4"
            disabled={submitting}
          >
            {submitting ? 'Creating Account...' : 'Register'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
};
