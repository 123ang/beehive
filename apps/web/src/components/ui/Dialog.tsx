"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "./Button";

export type DialogType = "success" | "error" | "warning" | "info";

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  type?: DialogType;
  title?: string;
  message: string;
  showCloseButton?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  link?: {
    url: string;
    label: string;
  };
}

const typeConfig = {
  success: {
    icon: CheckCircle,
    iconColor: "text-green-400",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    titleColor: "text-green-400",
  },
  error: {
    icon: AlertCircle,
    iconColor: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    titleColor: "text-red-400",
  },
  warning: {
    icon: AlertTriangle,
    iconColor: "text-yellow-400",
    bgColor: "bg-yellow-500/10",
    borderColor: "border-yellow-500/30",
    titleColor: "text-yellow-400",
  },
  info: {
    icon: Info,
    iconColor: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    titleColor: "text-blue-400",
  },
};

export function Dialog({
  isOpen,
  onClose,
  type = "info",
  title,
  message,
  showCloseButton = true,
  actionLabel,
  onAction,
  link,
}: DialogProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  // Auto-close after 5 seconds for success messages
  useEffect(() => {
    if (isOpen && type === "success" && !onAction) {
      const timer = setTimeout(() => {
        onClose();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, type, onClose, onAction]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
          />

          {/* Dialog */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="w-full max-w-md bg-gray-900 border border-white/10 rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className={`p-6 ${config.bgColor} ${config.borderColor} border-b`}>
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 ${config.iconColor}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    {title && (
                      <h3 className={`text-lg font-semibold mb-1 ${config.titleColor}`}>
                        {title}
                      </h3>
                    )}
                    <p className="text-gray-300 whitespace-pre-line break-words">
                      {message}
                    </p>
                  </div>
                  {showCloseButton && (
                    <button
                      onClick={onClose}
                      className="flex-shrink-0 p-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Actions */}
              {(link || actionLabel || showCloseButton) && (
                <div className="p-6 flex items-center justify-end gap-3">
                  {link && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(link.url, "_blank")}
                      className="flex items-center gap-2"
                    >
                      {link.label}
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  )}
                  {actionLabel && onAction && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onAction();
                        onClose();
                      }}
                    >
                      {actionLabel}
                    </Button>
                  )}
                  {showCloseButton && !actionLabel && (
                    <Button variant="primary" size="sm" onClick={onClose}>
                      OK
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

