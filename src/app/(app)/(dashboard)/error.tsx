"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "@/components/icons";
import HelpfulLinks from "@/components/HelpfulLinks";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4 sm:p-6">
      <div className="rounded-card border border-line bg-surface p-6 sm:p-10 max-w-md w-full text-center">
        <span className="mx-auto mb-5 grid size-16 place-items-center rounded-card bg-warning-soft text-warning">
          <AlertTriangle className="w-8 h-8" />
        </span>
        <h1 className="text-xl font-extrabold text-fg mb-2">Etwas ist schiefgelaufen</h1>
        <p className="text-sm text-muted">Ein unerwarteter Fehler ist aufgetreten. Versuch es noch einmal — meist klappt es dann.</p>
        {error.digest && <p className="mt-1 text-xs text-subtle font-mono">ID: {error.digest}</p>}

        <button
          onClick={reset}
          className="mt-6 mb-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control bg-primary px-5 text-sm font-bold text-primary-ink hover:bg-primary-hover transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Erneut versuchen
        </button>
        <HelpfulLinks />
      </div>
    </div>
  );
}
