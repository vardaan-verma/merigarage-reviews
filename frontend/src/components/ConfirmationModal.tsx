import React, { useState } from 'react';
import { Modal } from './Modal';
import { useNotification } from '../context/NotificationContext';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: string;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  icon,
  loading: externalLoading,
  onConfirm,
  onCancel,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);
  const isLoading = externalLoading ?? internalLoading;

  const handleConfirm = async () => {
    try {
      setInternalLoading(true);
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          btnClass: 'btn btn-primary bg-danger hover:bg-danger/80 border-danger text-white shadow-lg',
          iconColor: 'text-danger',
          iconBg: 'bg-danger/10 border-danger/30',
          defaultIcon: 'delete',
        };
      case 'warning':
        return {
          btnClass: 'btn btn-primary bg-amber-600 hover:bg-amber-500 border-amber-600 text-white shadow-lg',
          iconColor: 'text-warning',
          iconBg: 'bg-warning/10 border-warning/30',
          defaultIcon: 'warning',
        };
      case 'primary':
      default:
        return {
          btnClass: 'btn btn-primary shadow-lg',
          iconColor: 'text-primary',
          iconBg: 'bg-primary/10 border-primary/30',
          defaultIcon: 'check_circle',
        };
    }
  };

  const styles = getVariantStyles();
  const displayIcon = icon || styles.defaultIcon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onCancel}
      title={title}
      maxWidth="sm"
      zIndex={2000}
      overlayClassName="modal-overlay-elevated"
    >
      <div className="space-y-5">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center border flex-shrink-0 ${styles.iconBg} ${styles.iconColor}`}
          >
            <span className="material-symbols-outlined text-2xl">{displayIcon}</span>
          </div>

          <div className="flex-1 min-w-0 pt-1">
            {typeof message === 'string' ? (
              <p className="text-secondary text-sm leading-relaxed">{message}</p>
            ) : (
              message
            )}
          </div>
        </div>

        <div className="modal-actions pt-2 flex justify-end gap-3 border-t border-border">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`btn-sm flex items-center gap-2 ${styles.btnClass}`}
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading && (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>{isLoading ? 'Processing...' : confirmText}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Global Confirmation Modal listening to imperative `confirm()` calls
 */
export const GlobalConfirmationModal: React.FC = () => {
  const { activeConfirm, dismissConfirm } = useNotification();
  const [submitting, setSubmitting] = useState(false);

  if (!activeConfirm) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      dismissConfirm(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (!submitting) {
      dismissConfirm(false);
    }
  };

  return (
    <ConfirmationModal
      isOpen={Boolean(activeConfirm)}
      title={activeConfirm.title}
      message={activeConfirm.message}
      confirmText={activeConfirm.confirmText}
      cancelText={activeConfirm.cancelText}
      variant={activeConfirm.variant}
      icon={activeConfirm.icon}
      loading={submitting}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
};
