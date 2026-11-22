"use client";
import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "@/components/icons";
import Link from "next/link";

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
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="glass card-shine rounded-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
        {/* Glow */}

        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-400" />
          </div>

          <h1 className="text-lg font-semibold text-white mb-2">Etwas ist schiefgelaufen</h1>
          <p className="text-sm text-gray-500 mb-2">
            Ein unerwarteter Fehler ist aufgetreten.
          </p>
          {error.digest && (
            <p className="text-[10px] text-gray-700 font-mono mb-6">ID: {error.digest}</p>
          )}

          <div className="flex items-center justify-center gap-3 mt-6">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 glass hover:bg-line border border-line-strong hover:border-line-strong text-white text-sm font-medium px-4 py-2.5 rounded-card transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Erneut versuchen
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-primary-ink text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
