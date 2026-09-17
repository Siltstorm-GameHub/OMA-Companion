"use client";

// ============================================
// MobaConfirmDialog — Bestätigungs-Dialog im MOBA-Kit-Stil
// ============================================
// Quelle: Assets/UI/MOBA Style/PNG/DIALOGS/POPUP, kopiert nach
// public/battle-cards/moba/popup/. Ersetzt window.confirm()/generische
// Modals für Battle-Cards-spezifische Bestätigungen (z.B. laufendes Duell
// verlassen) — bewusst nur innerhalb von Battle Cards, nicht app-weit (siehe
// src/components/admin/ConfirmDialog.tsx für den Admin-Bereich).

const TONE_HEADER = {
  warning: "/battle-cards/moba/popup/warning.png",
  info: "/battle-cards/moba/popup/alert.png",
} as const;

export default function MobaConfirmDialog({
  open,
  tone = "warning",
  title,
  message,
  confirmLabel,
  cancelLabel = "Abbrechen",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  tone?: "warning" | "info";
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div className="relative w-full max-w-[300px]" onClick={(e) => e.stopPropagation()}>
        <img
          src="/battle-cards/moba/popup/box3.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full z-0"
          style={{ objectFit: "fill" }}
        />
        <button
          onClick={onCancel}
          aria-label="Schließen"
          className="absolute -top-1 -right-1 z-20 w-7 h-7 hover:scale-110 transition-transform"
        >
          <img src="/battle-cards/moba/popup/btn-cancel.png" alt="" aria-hidden className="w-full h-full object-contain" />
        </button>

        <div className="relative z-10 pt-5 px-4 pb-4 space-y-3">
          <div className="relative h-8 flex items-center justify-center">
            <img
              src={TONE_HEADER[tone]}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full"
              style={{ objectFit: "fill" }}
            />
            <span className="relative z-10 text-[11px] font-black uppercase tracking-wide text-white text-center px-2">
              {title}
            </span>
          </div>
          <p className="text-xs text-slate-300 text-center leading-snug">{message}</p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg text-xs font-semibold border border-slate-700 text-slate-300 hover:border-slate-500 transition-colors"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-colors ${
                tone === "warning" ? "bg-rose-600 hover:bg-rose-500 text-white" : "bg-teal-600 hover:bg-teal-500 text-white"
              }`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
