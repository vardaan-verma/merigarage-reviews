import React from 'react';

interface AlertProps {
  type?: 'error' | 'success' | 'warning' | 'info';
  message: string;
  details?: Record<string, string>;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type = 'info',
  message,
  details,
  onClose,
  className = '',
}) => {
  if (!message) return null;

  return (
    <div className={`alert alert-${type} ${className}`} role="alert">
      <div className="alert-content">
        <span className="alert-icon">
          {type === 'error' && '⚠️'}
          {type === 'success' && '✅'}
          {type === 'warning' && '⚡'}
          {type === 'info' && 'ℹ️'}
        </span>
        <div className="alert-body">
          <p className="alert-message">{message}</p>
          {details && Object.keys(details).length > 0 && (
            <ul className="alert-details-list">
              {Object.entries(details).map(([field, err]) => (
                <li key={field}>
                  <strong>{field}:</strong> {err}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {onClose && (
        <button
          type="button"
          className="alert-close-btn"
          onClick={onClose}
          aria-label="Dismiss alert"
        >
          ×
        </button>
      )}
    </div>
  );
};
