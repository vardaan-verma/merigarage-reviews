import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal } from './Modal';
import {
  setPendingAction,
  type ActionPortal,
  type ProtectedActionType,
} from '../utils/pendingActionStorage';
import { useNotification } from '../context/NotificationContext';

export interface AuthRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  portal?: ActionPortal;
  actionType: ProtectedActionType;
  returnUrl?: string;
  formState?: Record<string, any>;
  onBeforeSignIn?: () => void;
}

export const AuthRequiredModal: React.FC<AuthRequiredModalProps> = ({
  isOpen,
  onClose,
  title = 'Sign In Required',
  message,
  portal = 'customer',
  actionType,
  returnUrl,
  formState,
  onBeforeSignIn,
}) => {
  const navigate = useNavigate();

  const handleSignInClick = () => {
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
    onClose();

    navigate(`/login?portal=${portal}`, {
      state: {
        pendingAction,
        from: { pathname: targetReturnUrl },
      },
    });
  };

  const portalLabel = portal === 'garage' ? 'Garage Owner' : 'Vehicle Owner';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      maxWidth="sm"
      zIndex={2000}
      overlayClassName="modal-overlay-elevated"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/30 text-primary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-2xl">lock</span>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-white font-semibold text-sm leading-snug mb-1.5">
              {message}
            </p>
            <p className="text-secondary text-xs leading-relaxed">
              Sign in to your {portalLabel} account to continue. Your entered details will be safely preserved when you return.
            </p>
          </div>
        </div>

        <div className="modal-actions pt-2 flex justify-end gap-3 border-t border-border">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm flex items-center gap-2 shadow-lg"
            onClick={handleSignInClick}
          >
            <span className="material-symbols-outlined text-sm">login</span>
            <span>Sign In ({portalLabel})</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Global Auth Required Modal listening to imperative `requestAuth()` calls
 */
export const GlobalAuthModal: React.FC = () => {
  const { activeAuthRequired, dismissAuthRequired } = useNotification();

  if (!activeAuthRequired) return null;

  return (
    <AuthRequiredModal
      isOpen={Boolean(activeAuthRequired)}
      onClose={dismissAuthRequired}
      title={activeAuthRequired.title}
      message={activeAuthRequired.message}
      portal={activeAuthRequired.portal}
      actionType={activeAuthRequired.actionType}
      returnUrl={activeAuthRequired.returnUrl}
      formState={activeAuthRequired.formState}
      onBeforeSignIn={activeAuthRequired.onBeforeSignIn}
    />
  );
};
