"use client";

import { useCallback, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/Modal";

export interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  typedConfirmText?: string;
}

export interface ConfirmDialogProps extends ConfirmOptions {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bestätigen",
  cancelLabel = "Abbrechen",
  variant = "default",
  loading = false,
  typedConfirmText,
  onConfirm,
}: ConfirmDialogProps) {
  const [typedValue, setTypedValue] = useState("");
  const wasOpenRef = useRef(open);
  if (open !== wasOpenRef.current) {
    wasOpenRef.current = open;
    if (open && typedValue) setTypedValue("");
  }

  const close = () => {
    if (loading) return;
    onOpenChange(false);
  };

  const confirmDisabled = loading || (!!typedConfirmText && typedValue !== typedConfirmText);

  return (
    <Modal open={open} onClose={close} title={title} size="sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-gray-400 whitespace-pre-line">{description}</p>}
        {typedConfirmText && (
          <div className="space-y-1.5">
            <label className="text-xs text-gray-500 block">
              Tippe <span className="font-semibold text-gray-300">{typedConfirmText}</span> zum Bestätigen
            </label>
            <input
              autoFocus
              value={typedValue}
              onChange={(e) => setTypedValue(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-red-500/50 transition-colors"
            />
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={close}
            disabled={loading}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white hover:bg-white/[0.06] transition-colors disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm()}
            disabled={confirmDisabled}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40 ${
              variant === "danger" ? "bg-red-600 hover:bg-red-500 text-white" : "bg-teal-600 hover:bg-teal-500 text-white"
            }`}
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

interface ConfirmState {
  open: boolean;
  opts: ConfirmOptions;
  resolve?: (value: boolean) => void;
}

const EMPTY_STATE: ConfirmState = { open: false, opts: { title: "" } };

/**
 * Imperative replacement for `window.confirm()`.
 * Usage: const { confirm, ConfirmDialogElement } = useConfirm();
 *        if (!(await confirm({ title: "...", variant: "danger" }))) return;
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState>(EMPTY_STATE);
  const pendingResolve = useRef<((value: boolean) => void) | undefined>(undefined);

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      pendingResolve.current = resolve;
      setState({ open: true, opts });
    });
  }, []);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      pendingResolve.current?.(false);
      pendingResolve.current = undefined;
      setState(EMPTY_STATE);
    }
  };

  const handleConfirm = () => {
    pendingResolve.current?.(true);
    pendingResolve.current = undefined;
    setState(EMPTY_STATE);
  };

  const ConfirmDialogElement: ReactNode = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={handleOpenChange}
      title={state.opts.title}
      description={state.opts.description}
      confirmLabel={state.opts.confirmLabel}
      cancelLabel={state.opts.cancelLabel}
      variant={state.opts.variant}
      typedConfirmText={state.opts.typedConfirmText}
      onConfirm={handleConfirm}
    />
  );

  return { confirm, ConfirmDialogElement };
}
