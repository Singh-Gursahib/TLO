"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const maxW = size === "sm" ? "sm:max-w-md" : size === "lg" ? "sm:max-w-2xl" : "sm:max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "relative w-full bg-surface shadow-pop flex flex-col max-h-[92vh]",
          "rounded-t-3xl sm:rounded-3xl animate-sheet sm:animate-rise",
          maxW
        )}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-line-strong sm:hidden" />
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 px-5 pt-4 pb-3 border-b border-line">
            <div>
              {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
              {description && <p className="text-[13px] text-muted mt-0.5">{description}</p>}
            </div>
            <button onClick={onClose} className="icon-btn text-muted hover:bg-canvas -mr-1.5 -mt-1">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
        {footer && (
          <div className="px-5 py-3.5 border-t border-line bg-canvas/60 rounded-b-3xl pb-safe sm:pb-3.5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

/* Confirm dialog convenience */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return (
    <Sheet open={open} onClose={onClose} title={title} size="sm"
      footer={
        <div className="flex gap-2.5">
          <button className="btn-outline flex-1" onClick={onClose}>Cancel</button>
          <button
            className={cn(danger ? "btn-danger" : "btn-primary", "flex-1")}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </button>
        </div>
      }
    >
      <p className="text-sm text-body leading-relaxed">{message}</p>
    </Sheet>
  );
}
