import React from "react";
import { AlertCircle, X } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  details?: Record<string, any>;
  onDismiss?: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  details,
  onDismiss,
}) => {
  return (
    <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/25 rounded-2xl p-4 shadow-sm text-rose-800 dark:text-rose-300 relative transition-colors">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-rose-900 dark:text-rose-200">{message}</h4>
          {details && (
            <div className="mt-2 text-xs space-y-1 bg-white/70 dark:bg-rose-950/40 p-2.5 rounded-xl border border-rose-200/80 dark:border-rose-900/50">
              {Object.entries(details).map(([field, errs]) => (
                <div key={field}>
                  <strong className="text-rose-900 dark:text-rose-300 capitalize">{field.replace(/_/g, " ")}:</strong>{" "}
                  <span className="text-rose-700 dark:text-rose-400">
                    {Array.isArray(errs) ? errs.join(", ") : String(errs)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 text-rose-500 hover:text-rose-800 dark:hover:text-rose-200 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition"
            title="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
