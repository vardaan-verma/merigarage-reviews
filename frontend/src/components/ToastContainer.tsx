import React, { useEffect, useRef } from 'react';
import { useNotification, DEFAULT_TOAST_DURATION, type ToastItem } from '../context/NotificationContext';

interface SingleToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const SingleToast: React.FC<SingleToastProps> = ({ toast, onDismiss }) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const remainingTimeRef = useRef<number>(toast.duration || DEFAULT_TOAST_DURATION);
  const startTimeRef = useRef<number>(Date.now());

  const startTimer = () => {
    if (!toast.duration || toast.duration <= 0) return;
    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, remainingTimeRef.current);
  };

  const pauseTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      const elapsed = Date.now() - startTimeRef.current;
      remainingTimeRef.current = Math.max(0, remainingTimeRef.current - elapsed);
    }
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id]);

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return 'check_circle';
      case 'error':
        return 'error';
      case 'warning':
        return 'warning';
      case 'info':
      default:
        return 'info';
    }
  };

  const getAriaRole = () => {
    return toast.type === 'error' || toast.type === 'warning' ? 'alert' : 'status';
  };

  return (
    <div
      role={getAriaRole()}
      aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
      tabIndex={0}
      className={`toast-item toast-${toast.type} group`}
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      onFocus={pauseTimer}
      onBlur={startTimer}
    >
      <span
        className={`material-symbols-outlined text-xl flex-shrink-0 mt-0.5 ${
          toast.type === 'success'
            ? 'text-success'
            : toast.type === 'error'
            ? 'text-primary'
            : toast.type === 'warning'
            ? 'text-warning'
            : 'text-secondary'
        }`}
        aria-hidden="true"
      >
        {getIcon()}
      </span>

      <div className="flex-1 min-w-0 pr-1">
        {toast.title && (
          <h4 className="text-xs font-bold text-white tracking-wide uppercase mb-0.5">
            {toast.title}
          </h4>
        )}
        <p className="text-xs text-white/95 leading-snug font-medium break-words">
          {toast.message}
        </p>

        {toast.action && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toast.action?.onClick();
              onDismiss(toast.id);
            }}
            className="mt-2 text-2xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {toast.dismissable && (
        <button
          type="button"
          onClick={() => onDismiss(toast.id)}
          className="text-muted hover:text-white transition-colors p-1 -mr-1 -mt-1 rounded flex-shrink-0"
          aria-label="Dismiss notification"
        >
          <span className="material-symbols-outlined text-sm leading-none">close</span>
        </button>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      aria-label="Notifications"
      role="region"
    >
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
};
