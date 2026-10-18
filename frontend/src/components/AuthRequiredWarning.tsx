import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  setPendingAction,
  type ActionPortal,
  type ProtectedActionType,
} from '../utils/pendingActionStorage';

interface AuthRequiredWarningProps {
  /** The natural, action-specific warning message (e.g. "You must be signed in before asking for a quote.") */
  message: string;
  /** The login portal matching the action: 'customer' for vehicle owners, 'garage' for workshop owners */
  portal?: ActionPortal;
  /** Action identifier used to restore the specific modal/form */
  actionType: ProtectedActionType;
  /** Target return URL, defaults to current pathname + search */
  returnUrl?: string;
  /** Form data and UI state to preserve across the login flow */
  formState?: Record<string, any>;
  /** Optional custom button label */
  buttonText?: string;
  /** Optional callback before navigating */
  onBeforeSignIn?: () => void;
  className?: string;
}

export const AuthRequiredWarning: React.FC<AuthRequiredWarningProps> = ({
  message,
  portal = 'customer',
  actionType,
  returnUrl,
  formState,
  buttonText,
  onBeforeSignIn,
  className = '',
}) => {
  const navigate = useNavigate();

  const handleSignInClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onBeforeSignIn) {
      onBeforeSignIn();
    }

    const targetReturnUrl = returnUrl || (window.location.pathname + window.location.search);

    const pendingAction = {
      id: `${actionType}_${Date.now()}`,
      actionType,
      returnUrl: targetReturnUrl,
      portal,
      formState,
    };

    setPendingAction(pendingAction);

    navigate(`/login?portal=${portal}`, {
      state: {
        pendingAction,
        from: { pathname: targetReturnUrl },
      },
    });
  };

  const portalLabel = portal === 'garage' ? 'Garage Owner' : 'Vehicle Owner';
  const defaultButtonLabel = buttonText || `Sign In (${portalLabel}) to Continue`;

  return (
    <div
      role="alert"
      className={`p-4 rounded-xl border border-warning/40 bg-warning/10 text-white space-y-3 transition-all ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="material-symbols-outlined text-warning text-2xl flex-shrink-0 mt-0.5">
          lock
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-warning leading-snug">
            {message}
          </p>
        </div>
      </div>

      <div className="pt-1">
        <button
          type="button"
          onClick={handleSignInClick}
          className="btn btn-primary btn-sm flex items-center justify-center gap-2 font-semibold shadow-md hover:scale-[1.01] active:scale-[0.99] transition-transform w-full sm:w-auto"
        >
          <span className="material-symbols-outlined text-sm">login</span>
          <span>{defaultButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};
