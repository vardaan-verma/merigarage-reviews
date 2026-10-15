import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { UserDto } from '../api/types';

// Google Identity Services (GIS) type helper
interface GoogleIdClient {
  initialize: (config: {
    client_id: string;
    callback: (response: { credential: string }) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: string | number;
    }
  ) => void;
  prompt: (momentListener?: (notification: any) => void) => void;
}

interface GoogleAuthButtonProps {
  mode?: 'signin' | 'signup';
  roleTab?: 'customer' | 'garage';
  onSuccess?: (user: UserDto) => void;
  onError?: (errorMessage: string) => void;
  disabled?: boolean;
  className?: string;
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  mode = 'signin',
  roleTab = 'customer',
  onSuccess,
  onError,
  disabled = false,
  className = '',
}) => {
  const { loginWithGoogle } = useAuth();
  const googleBtnContainerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const isGisConfigured = Boolean(clientId && clientId.trim().length > 5);

  const handleCredentialResponse = async (credential: string) => {
    try {
      setLoading(true);
      const user = await loginWithGoogle(credential);
      onSuccess?.(user);
    } catch (err: any) {
      const msg = err.message || 'Google authentication failed. Please try again.';
      onError?.(msg);
    } finally {
      setLoading(false);
    }
  };

const getGoogleIdClient = (): GoogleIdClient | undefined => {
  return (window as any).google?.accounts?.id;
};

// Initialize official Google Identity Services button if Client ID is configured
  useEffect(() => {
    if (!isGisConfigured) return;

    let isMounted = true;

    const setupGoogleGis = () => {
      const googleId = getGoogleIdClient();
      if (!googleId || !googleBtnContainerRef.current) return;

      try {
        googleId.initialize({
          client_id: clientId.trim(),
          callback: (response: { credential: string }) => {
            if (isMounted && response?.credential) {
              handleCredentialResponse(response.credential);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        // Clear previous render
        googleBtnContainerRef.current.innerHTML = '';

        googleId.renderButton(googleBtnContainerRef.current, {
          theme: 'outline',
          size: 'large',
          text: mode === 'signup' ? 'signup_with' : 'continue_with',
          shape: 'pill',
          width: '100%',
          logo_alignment: 'left',
        });
      } catch (e) {
        console.warn('Could not initialize Google Identity Services button:', e);
      }
    };

    if (getGoogleIdClient()) {
      setupGoogleGis();
    } else {
      const interval = setInterval(() => {
        if (getGoogleIdClient()) {
          clearInterval(interval);
          setupGoogleGis();
        }
      }, 300);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [clientId, isGisConfigured, mode]);

  const handleCustomButtonClick = () => {
    if (disabled || loading) return;

    const googleId = getGoogleIdClient();
    if (isGisConfigured && googleId) {
      try {
        googleId.prompt();
      } catch {
        setShowConfigModal(true);
      }
    } else {
      // Show setup dialog & instant demo option
      setShowConfigModal(true);
    }
  };

  const handleDemoSignIn = async (demoEmail: string, demoName: string) => {
    setShowConfigModal(false);
    const demoToken = `test_google_token:${demoEmail}:${demoName}`;
    await handleCredentialResponse(demoToken);
  };

  const buttonLabel =
    mode === 'signup'
      ? 'Sign up with Google'
      : roleTab === 'garage'
      ? 'Continue with Google (Workshop)'
      : 'Continue with Google';

  return (
    <>
      <div className={`google-auth-container w-full ${className}`}>
        {isGisConfigured ? (
          <div className="w-full flex justify-center items-center relative">
            {/* GIS Container mounts here */}
            <div
              ref={googleBtnContainerRef}
              className={`w-full flex justify-center ${loading ? 'opacity-40 pointer-events-none' : ''}`}
            />
            {loading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                <span className="spinner spinner-sm mr-2" />
                <span className="text-xs text-white font-medium">Verifying with Google...</span>
              </div>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={handleCustomButtonClick}
            disabled={disabled || loading}
            className="btn btn-google w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-full border transition-all text-sm font-semibold shadow-sm hover:shadow-md"
            title="Sign in with your Google Account"
          >
            {loading ? (
              <>
                <span className="spinner spinner-sm" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
                <span>{buttonLabel}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Google OAuth Setup & Instant Demo Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="card p-6 max-w-lg w-full bg-[#181717] border border-border shadow-2xl rounded-2xl relative text-left">
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="absolute top-4 right-4 text-secondary hover:text-white transition-colors"
              aria-label="Close dialog"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-md">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.665-5.17 3.665-9.12z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.27 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.57H1.25C.45 8.15 0 9.99 0 12s.45 3.85 1.25 5.43l4.03-3.14z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.27 2.64 1.25 6.57l4.03 3.14c.95-2.83 3.6-4.96 6.72-4.96z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white">Google OAuth Authentication</h3>
                <p className="text-xs text-secondary">
                  Ready for live Google Cloud production & instant test demo
                </p>
              </div>
            </div>

            <div className="bg-[#101010] p-4 rounded-xl border border-border mb-4 text-xs space-y-2">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-sm">settings_suggest</span>
                Enable Real Google Sign-In with your Google Account:
              </div>
              <ol className="list-decimal pl-4 space-y-1 text-secondary">
                <li>
                  Open <strong className="text-white">Google Cloud Console</strong> &gt; <em>APIs & Services</em> &gt; <em>Credentials</em>.
                </li>
                <li>
                  Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).
                </li>
                <li>
                  Add Authorized JavaScript Origin: <code className="text-primary font-mono bg-black/40 px-1 py-0.5 rounded">http://localhost:5173</code>.
                </li>
                <li>
                  Set <code className="text-primary font-mono bg-black/40 px-1 py-0.5 rounded">VITE_GOOGLE_CLIENT_ID</code> in <code className="text-white">frontend/.env</code> and <code className="text-primary font-mono bg-black/40 px-1 py-0.5 rounded">GOOGLE_CLIENT_ID</code> in backend.
                </li>
              </ol>
            </div>

            <div className="border-t border-border pt-4">
              <div className="text-xs font-bold text-white mb-2 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-success text-sm">bolt</span>
                Test Google OAuth Service Right Now (One-Click):
              </div>
              <p className="text-xs text-secondary mb-3">
                Experience the complete Google OAuth authentication, automatic user registration, and session initialization without waiting for GCP credentials:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('google.motorist@merigarage.com', 'Rahul (Google Motorist)')}
                  className="btn btn-outline btn-sm flex items-center justify-center gap-1.5 py-2"
                >
                  <span className="material-symbols-outlined text-sm text-primary">directions_car</span>
                  <span>Test as Motorist</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('google.owner@merigarage.com', 'Vikram (Google Workshop)')}
                  className="btn btn-outline btn-sm flex items-center justify-center gap-1.5 py-2"
                >
                  <span className="material-symbols-outlined text-sm text-primary">construction</span>
                  <span>Test as Workshop Hub</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
