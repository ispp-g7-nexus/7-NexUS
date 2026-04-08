import { useEffect } from 'react';
import { X, CheckCircle, AlertCircle } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export const Toast = ({ message, type = 'info', onClose, duration = 4000 }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const bgColor = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }[type];

  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    info: AlertCircle,
  }[type];

  const iconColor = {
    success: 'text-green-500',
    error: 'text-red-500',
    info: 'text-blue-500',
  }[type];

  return (
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all duration-300 animate-in slide-in-from-bottom-5 ${bgColor}`}>
      <Icon className={`w-5 h-5 shrink-0 ${iconColor}`} />
      <p className="text-sm font-medium">{message}</p>
      <button onClick={onClose} className="p-1.5 hover:bg-black/5 rounded-full transition-colors ml-2 shrink-0">
        <X className="w-4 h-4 opacity-70" />
      </button>
    </div>
  );
};
