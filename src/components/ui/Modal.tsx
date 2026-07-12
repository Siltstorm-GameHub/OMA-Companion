"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: "sm" | "md" | "lg" | "drawer";
  children: ReactNode;
}

const PANEL_WIDTH: Record<"sm" | "md" | "lg", string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({ open, onClose, title, size = "md", children }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const isDrawer = size === "drawer";

  useEffect(() => {
    if (!open) return;
    triggerRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      triggerRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open && !isDrawer) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0, pointerEvents: open ? "auto" : "none" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={isDrawer ? "fixed inset-y-0 right-0 z-50 flex" : "fixed inset-0 z-50 flex items-center justify-center p-4"}
        style={isDrawer ? { pointerEvents: open ? "auto" : "none" } : undefined}
        onClick={isDrawer ? undefined : onClose}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? titleId : undefined}
          tabIndex={-1}
          onClick={(e) => e.stopPropagation()}
          className={
            isDrawer
              ? `w-full sm:w-[500px] h-full bg-gray-950 border-l border-white/[0.06] shadow-2xl flex flex-col transition-transform duration-300 ease-out outline-none ${open ? "translate-x-0" : "translate-x-full"}`
              : `glass-heavy rounded-2xl w-full ${PANEL_WIDTH[size as "sm" | "md" | "lg"]} max-h-[90vh] flex flex-col outline-none`
          }
        >
          {title && (
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.06] shrink-0">
              <h2 id={titleId} className="font-semibold text-white flex-1 truncate">{title}</h2>
              <button onClick={onClose} aria-label="Schließen" className="p-2 rounded-lg hover:bg-white/[0.06] text-gray-500 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className={isDrawer ? "flex-1 flex flex-col min-h-0" : "p-5 overflow-y-auto"}>
            {children}
          </div>
        </div>
      </div>
    </>
  );
}
