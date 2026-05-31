"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-10 flex flex-col items-center gap-6 w-full max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-700 to-rose-900 flex items-center justify-center shadow-lg shadow-rose-900/40">
          <svg viewBox="0 0 24 24" fill="white" className="w-9 h-9">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.01.095.053.182.112.245a19.89 19.89 0 0 0 5.993 3.03.077.077 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>
        <div className="text-center">
          <h1 className="text-white text-2xl font-semibold">Old Masters Ally</h1>
          <p className="text-gray-400 text-sm mt-1">Companion App</p>
        </div>
        <button
          onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
          className="w-full bg-rose-800 hover:bg-rose-700 text-white font-medium py-3 px-6 rounded-xl flex items-center justify-center gap-3 transition-colors"
        >
          Mit Discord anmelden
        </button>
        <p className="text-gray-600 text-xs text-center">
          Durch die Anmeldung stimmst du zu, dass wir deine Discord-Daten für den Betrieb des Portals verwenden.
        </p>
      </div>
    </main>
  );
}
