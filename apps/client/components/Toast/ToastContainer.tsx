import { Check, Bell, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/contexts/Toast.context';
import type { ToastVariant } from '@/contexts/Toast.context';
import classNames from 'classnames';
import styles from './ToastContainer.module.scss';

function ToastItem({
  id,
  message,
  variant,
  onDismiss,
}: {
  id: string;
  message: string;
  variant: ToastVariant;
  onDismiss: (id: string) => void;
}) {
  return (
    <div
      role="alert"
      className={classNames(styles.toast, styles[variant])}
      onClick={() => onDismiss(id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDismiss(id);
        }
      }}
      tabIndex={0}
      aria-label="Notificación. Pulse Enter o Espacio para cerrar."
    >
      {variant === 'info' && (
        <span className={styles.icon} aria-hidden>
          <Bell size={12} strokeWidth={2.5} />
        </span>
      )}
      {variant === 'success' && (
        <span className={styles.icon} aria-hidden>
          <Check size={12} strokeWidth={3} />
        </span>
      )}
      {variant === 'error' && (
        <span className={styles.icon} aria-hidden>
          <AlertCircle size={12} strokeWidth={2.5} />
        </span>
      )}
      {variant === 'warning' && (
        <span className={styles.icon} aria-hidden>
          <AlertTriangle size={12} strokeWidth={2.5} />
        </span>
      )}
      <span className={styles.message}>{message}</span>
      <button
        type="button"
        className={styles.close}
        aria-label="Cerrar"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(id);
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className={styles.container} aria-live="polite">
      {toasts.map((t) => (
        <ToastItem
          key={t.id}
          id={t.id}
          message={t.message}
          variant={t.variant}
          onDismiss={removeToast}
        />
      ))}
    </div>
  );
}
