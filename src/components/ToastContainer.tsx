import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import React from 'react';
import type { ToastItem } from '../types/nexora';

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)] sm:w-auto pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className="pointer-events-auto flex items-center gap-2.5 rounded-lg border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-[#15192A] px-3.5 py-2.5 shadow-lg text-sm text-slate-800 dark:text-slate-100"
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          {toast.type === 'info' && (
            <Info className="w-4 h-4 text-sky-500 shrink-0" />
          )}
          <span className="flex-1 text-[13px] leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Dismiss notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
