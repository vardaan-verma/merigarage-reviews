import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert } from '../components/Alert';

export const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const from = (location.state as any)?.from?.pathname || '/profile';

  // If already authenticated, redirect
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMessage('Please provide both email address and password.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage(null);
      await login(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container py-12 flex justify-center">
      <div className="card p-8 auth-card w-full max-w-md">
        <div className="text-center mb-6">
          <span className="brand-dot mx-auto mb-2 inline-block"></span>
          <h1 className="text-2xl font-bold">Sign In to MeriGarage</h1>
          <p className="text-secondary text-xs mt-1">
            Access your garage reviews, claims, and workshop dashboard.
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
            <label className="form-label" htmlFor="login-email">
              Email Address *
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder="user@example.com"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <div className="flex-between">
              <label className="form-label" htmlFor="login-password">
                Password *
              </label>
            </div>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-4"
            disabled={submitting}
          >
            {submitting ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-border text-center text-xs text-muted">
          Don't have an account yet?{' '}
          <Link to="/register" className="text-primary font-medium hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};
