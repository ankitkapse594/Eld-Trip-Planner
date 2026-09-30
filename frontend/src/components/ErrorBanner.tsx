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
    <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 shadow-xl text-red-300 relative">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-red-200">{message}</h4>
          {details && (
            <div className="mt-2 text-xs space-y-1 bg-red-950/40 p-2.5 rounded-xl border border-red-900/50">
              {Object.entries(details).map(([field, errs]) => (
                <div key={field}>
                  <strong className="text-red-300 capitalize">{field.replace(/_/g, " ")}:</strong>{" "}
                  <span className="text-red-400">
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
            className="p-1 text-red-400 hover:text-red-200 rounded-lg hover:bg-red-500/20 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
