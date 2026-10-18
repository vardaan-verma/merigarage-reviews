import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import type { ActionPortal, ProtectedActionType } from '../utils/pendingActionStorage';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissable?: boolean;
  action?: ToastAction;
  createdAt: number;
}

export interface ShowToastOptions {
  type?: ToastType;
  title?: string;
  message: string;
  duration?: number;
  dismissable?: boolean;
  action?: ToastAction;
}

export interface ConfirmDialogOptions {
  title: string;
  message: string | React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  icon?: string;
}

export interface AuthRequiredOptions {
  message: string;
  title?: string;
  portal?: ActionPortal;
  actionType: ProtectedActionType;
  returnUrl?: string;
  formState?: Record<string, any>;
  onBeforeSignIn?: () => void;
}

interface NotificationContextValue {
  toasts: ToastItem[];
  showToast: (options: ShowToastOptions) => string;
  showSuccess: (message: string, title?: string, duration?: number) => string;
  showError: (message: string, title?: string, duration?: number) => string;
  showWarning: (message: string, title?: string, duration?: number) => string;
  showInfo: (message: string, title?: string, duration?: number) => string;
  dismissToast: (id: string) => void;
  clearToasts: () => void;

  // Imperative Confirmation Modal
  confirm: (options: ConfirmDialogOptions) => Promise<boolean>;
  activeConfirm: (ConfirmDialogOptions & { resolve: (val: boolean) => void }) | null;
  dismissConfirm: (result: boolean) => void;

  // Imperative Auth Required Modal
  requestAuth: (options: AuthRequiredOptions) => void;
  activeAuthRequired: AuthRequiredOptions | null;
  dismissAuthRequired: () => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const DEFAULT_TOAST_DURATION = 2500;

let toastCounter = 0;

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [activeConfirm, setActiveConfirm] = useState<
    (ConfirmDialogOptions & { resolve: (val: boolean) => void }) | null
  >(null);
  const [activeAuthRequired, setActiveAuthRequired] = useState<AuthRequiredOptions | null>(null);

  // Prevent duplicate spam within 1.2 seconds
  const recentToastsRef = useRef<Map<string, number>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = DEFAULT_TOAST_DURATION,
      dismissable = true,
      action,
    }: ShowToastOptions): string => {
      const now = Date.now();
      const dedupKey = `${type}:${message}`;
      const lastSeen = recentToastsRef.current.get(dedupKey);

      // Deduplicate identical toasts appearing within 1.2 seconds
      if (lastSeen && now - lastSeen < 1200) {
        return '';
      }
      recentToastsRef.current.set(dedupKey, now);

      toastCounter += 1;
      const id = `mg_toast_${now}_${toastCounter}`;

      const newToast: ToastItem = {
        id,
        type,
        title,
        message,
        duration: duration ?? DEFAULT_TOAST_DURATION,
        dismissable,
        action,
        createdAt: now,
      };

      setToasts((prev) => {
        // Keep up to 4 toasts visible at a time
        const truncated = prev.length >= 4 ? prev.slice(prev.length - 3) : prev;
        return [...truncated, newToast];
      });

      return id;
    },
    []
  );

  const showSuccess = useCallback(
    (message: string, title?: string, duration?: number) => {
      return showToast({ type: 'success', message, title, duration: duration ?? DEFAULT_TOAST_DURATION });
    },
    [showToast]
  );

  const showError = useCallback(
    (message: string, title?: string, duration?: number) => {
      return showToast({ type: 'error', message, title, duration: duration ?? DEFAULT_TOAST_DURATION });
    },
    [showToast]
  );

  const showWarning = useCallback(
    (message: string, title?: string, duration?: number) => {
      return showToast({ type: 'warning', message, title, duration: duration ?? DEFAULT_TOAST_DURATION });
    },
    [showToast]
  );

  const showInfo = useCallback(
    (message: string, title?: string, duration?: number) => {
      return showToast({ type: 'info', message, title, duration: duration ?? DEFAULT_TOAST_DURATION });
    },
    [showToast]
  );

  // Imperative Confirmation Dialog
  const confirm = useCallback((options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setActiveConfirm({
        ...options,
        resolve,
      });
    });
  }, []);

  const dismissConfirm = useCallback(
    (result: boolean) => {
      if (activeConfirm) {
        activeConfirm.resolve(result);
        setActiveConfirm(null);
      }
    },
    [activeConfirm]
  );

  // Imperative Auth Required Dialog
  const requestAuth = useCallback((options: AuthRequiredOptions) => {
    setActiveAuthRequired(options);
  }, []);

  const dismissAuthRequired = useCallback(() => {
    setActiveAuthRequired(null);
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        dismissToast,
        clearToasts,
        confirm,
        activeConfirm,
        dismissConfirm,
        requestAuth,
        activeAuthRequired,
        dismissAuthRequired,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Aliases for intuitive use
export const useToast = () => {
  const { showToast, showSuccess, showError, showWarning, showInfo, dismissToast, clearToasts } =
    useNotification();
  return { showToast, showSuccess, showError, showWarning, showInfo, dismissToast, clearToasts };
};

export const useConfirm = () => {
  const { confirm } = useNotification();
  return confirm;
};

export const useAuthRequired = () => {
  const { requestAuth } = useNotification();
  return requestAuth;
};
