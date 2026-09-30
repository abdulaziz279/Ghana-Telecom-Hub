import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from 'lucide-react';

export interface AppNotification {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface NotificationToasterProps {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
}

export const NotificationToaster: React.FC<NotificationToasterProps> = ({
  notifications,
  onDismiss,
}) => {
  return (
    <div
      id="notification-toaster-container"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
    >
      <AnimatePresence>
        {notifications.map((n) => {
          let bg = 'bg-slate-900 text-white border-slate-800';
          let icon = <Info className="w-5 h-5 text-sky-400 shrink-0" />;

          if (n.type === 'success') {
            bg = 'bg-emerald-950 text-emerald-100 border-emerald-800';
            icon = <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />;
          } else if (n.type === 'warning') {
            bg = 'bg-amber-950 text-amber-100 border-amber-800';
            icon = <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />;
          } else if (n.type === 'error') {
            bg = 'bg-rose-950 text-rose-100 border-rose-800';
            icon = <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />;
          }

          return (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
              id={`toast-${n.id}`}
              className={`pointer-events-auto rounded-xl p-3.5 shadow-xl border flex items-start gap-3 backdrop-blur-md ${bg}`}
            >
              {icon}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold tracking-wide uppercase opacity-75">{n.title}</p>
                <p className="text-sm font-medium leading-snug mt-0.5">{n.message}</p>
              </div>
              <button
                id={`toast-dismiss-${n.id}`}
                onClick={() => onDismiss(n.id)}
                className="text-slate-400 hover:text-white p-1 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
