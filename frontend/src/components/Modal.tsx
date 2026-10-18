import React, { useEffect, useRef } from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  preventBackdropClose?: boolean;
  preventEscape?: boolean;
  className?: string;
  overlayClassName?: string;
  zIndex?: number;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
  preventBackdropClose = false,
  preventEscape = false,
  className = '',
  overlayClassName = '',
  zIndex,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  const preventEscapeRef = useRef(preventEscape);

  // Keep latest callbacks in refs so the effect does not re-run on parent re-renders
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    preventEscapeRef.current = preventEscape;
  });

  useEffect(() => {
    if (!isOpen) return;

    // Capture the trigger element that had focus before modal opened
    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the first interactive element or the modal container ONCE when opening
    const focusTimer = setTimeout(() => {
      if (!modalRef.current) return;

      // If user has already focused an element inside the modal, do not steal focus
      if (document.activeElement && modalRef.current.contains(document.activeElement)) {
        return;
      }

      // Prioritize autofocus elements or form controls in modal-body before fallback to header buttons
      const bodyInput = modalRef.current.querySelector<HTMLElement>(
        '.modal-body input:not([disabled]):not([type="hidden"]), .modal-body textarea:not([disabled]), .modal-body select:not([disabled]), [autofocus]'
      );

      if (bodyInput) {
        bodyInput.focus();
        return;
      }

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        modalRef.current.focus();
      }
    }, 40);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!preventEscapeRef.current) {
          e.preventDefault();
          onCloseRef.current();
        }
        return;
      }

      // Trap focus inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        );

        if (focusable.length === 0) {
          e.preventDefault();
          return;
        }

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);

      // Restore focus to original triggering element only when closing
      const prev = previousActiveElementRef.current;
      if (prev && document.body.contains(prev) && typeof prev.focus === 'function') {
        prev.focus();
      }
    };
  }, [isOpen]);

  // Fallback cleanup if component unmounts while open
  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !preventBackdropClose) {
      onClose();
    }
  };

  return (
    <div
      className={`modal-backdrop modal-overlay animate-fade-in ${overlayClassName}`}
      style={zIndex ? { zIndex } : undefined}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      aria-describedby={subtitle ? 'modal-subtitle' : undefined}
    >
      <div
        className={`modal-dialog modal-content modal-${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
        ref={modalRef}
        tabIndex={-1}
      >
        <div className="modal-header">
          <div>
            <h2 id="modal-title" className="modal-title">
              {title}
            </h2>
            {subtitle && (
              <p id="modal-subtitle" className="text-2xs text-secondary mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            className="modal-close-btn modal-close"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
};
