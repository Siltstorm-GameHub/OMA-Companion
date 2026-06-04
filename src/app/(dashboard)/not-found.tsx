import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="glass card-shine rounded-2xl p-10 max-w-md w-full text-center relative overflow-hidden">
        {/* Glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent pointer-events-none" />

        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto mb-5">
            <SearchX className="w-8 h-8 text-rose-400" />
          </div>

          <p className="text-5xl font-black text-white tabular-nums mb-2">404</p>
          <h1 className="text-lg font-semibold text-white mb-2">Seite nicht gefunden</h1>
          <p className="text-sm text-gray-500 mb-7">
            Diese Seite existiert nicht oder wurde entfernt.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors shadow-[0_0_16px_rgba(244,63,94,0.25)]"
          >
            <Home className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
