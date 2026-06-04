import Link from "next/link";
import { Home, SearchX } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "#080c18" }}
    >
      <div
        className="rounded-2xl p-10 max-w-md w-full text-center relative overflow-hidden"
        style={{
          background: "rgba(15,15,23,0.75)",
          border: "1px solid rgba(255,255,255,0.055)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/8 to-transparent pointer-events-none" />
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-rose-500/30 to-transparent pointer-events-none" />

        <div className="relative">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.2)" }}
          >
            <SearchX className="w-8 h-8" style={{ color: "#f87171" }} />
          </div>

          <p className="text-5xl font-black text-white tabular-nums mb-2">404</p>
          <h1 className="text-lg font-semibold text-white mb-2">Seite nicht gefunden</h1>
          <p className="text-sm mb-7" style={{ color: "#6b7280" }}>
            Diese Seite existiert nicht oder wurde entfernt.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            style={{ background: "#e11d48" }}
          >
            <Home className="w-4 h-4" />
            Zurück zum Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
