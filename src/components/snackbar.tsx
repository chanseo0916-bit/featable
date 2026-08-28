"use client";

import { useEffect } from "react";

export type SnackVariant = "default" | "positive" | "critical";

/**
 * SEED 스타일 Snackbar — 하단 중앙 토스트. 4초 자동 닫힘, tone(성공/실패/기본),
 * 보조 Action 버튼 지원. 한 번에 하나만 표시하세요.
 */
export function Snackbar({
  open,
  variant = "default",
  message,
  onClose,
  action,
  duration = 4000,
}: {
  open: boolean;
  variant?: SnackVariant;
  message: string;
  onClose: () => void;
  action?: { label: string; onClick: () => void };
  duration?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className="snackbar" role="status" aria-live="polite" data-variant={variant}>
      <span className="snackbar-icon" aria-hidden="true">
        {variant === "positive" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : variant === "critical" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 8v5M12 16.5v.01" />
          </svg>
        )}
      </span>
      <span className="snackbar-message">{message}</span>
      {action && (
        <button
          type="button"
          className="snackbar-action"
          onClick={() => {
            action.onClick();
            onClose();
          }}
        >
          {action.label}
        </button>
      )}
      <button type="button" className="snackbar-close" onClick={onClose} aria-label="알림 닫기">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
