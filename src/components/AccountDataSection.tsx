"use client";
import { useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { AlertTriangle } from "@/components/icons";

// Muss zu DELETE_CONFIRM_PHRASE in src/lib/account-deletion.ts passen (dort serverseitig geprüft)
const CONFIRM_PHRASE = "LÖSCHEN";

/** Profil-Einstellungen: Datenauskunft herunterladen und Konto löschen (DSGVO). */
export default function AccountDataSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  async function deleteAccount() {
    setBusy(true);
    try {
      const res = await fetch("/api/profile/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Löschen fehlgeschlagen");
      toast.success("Dein Konto wurde gelöscht.");
      await signOut({ callbackUrl: "/login" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Löschen fehlgeschlagen");
      setBusy(false);
    }
  }

  return (
    <section id="account">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest mb-3">🔒 Konto & Daten</h2>
      <div className="glass card-shine rounded-2xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-white">Meine Daten herunterladen</p>
            <p className="text-xs text-gray-500">Alle zu deinem Konto gespeicherten Daten als JSON-Datei.</p>
          </div>
          <a href="/api/profile/export" className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border border-white/10 hover:border-white/25 text-gray-200">
            Download
          </a>
        </div>

        <div className="border-t border-white/[0.06] pt-4">
          {!open ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Konto löschen</p>
                <p className="text-xs text-gray-500">Entfernt dein Profil und alle persönlichen Angaben.</p>
              </div>
              <button onClick={() => setOpen(true)} className="shrink-0 text-xs font-semibold px-3 py-2 rounded-xl border border-red-500/30 text-red-400 hover:border-red-500/60">
                Löschen…
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Das kann nicht rückgängig gemacht werden.</p>
                  <p className="text-red-300/80">
                    Name, Bild, Discord- und Twitch-Verknüpfung, Geburtstag, Profiltexte, Lobby-Nachrichten und
                    Push-Abos werden entfernt; Münzen, Rang-Punkte und Karten verfallen. Turnierergebnisse und
                    Beiträge bleiben für die Community erhalten, erscheinen aber nur noch als „Gelöschtes Mitglied“.
                    Meldest du dich später erneut an, startest du mit einem neuen, leeren Konto.
                  </p>
                </div>
              </div>
              <label className="text-xs text-gray-400">
                Zur Bestätigung <span className="font-mono font-semibold text-white">{CONFIRM_PHRASE}</span> eingeben:
                <input
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  className="mt-1.5 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white outline-none focus:border-red-500/50"
                  autoComplete="off"
                />
              </label>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setOpen(false); setConfirm(""); }} disabled={busy} className="text-xs font-semibold px-3 py-2 rounded-xl text-gray-400 hover:text-white">
                  Abbrechen
                </button>
                <button
                  onClick={deleteAccount}
                  disabled={busy || confirm !== CONFIRM_PHRASE}
                  className="text-xs font-semibold px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white disabled:opacity-40"
                >
                  {busy ? "Wird gelöscht…" : "Konto endgültig löschen"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-gray-600">
          <Link href="/datenschutz" className="hover:text-gray-400 underline-offset-2 hover:underline">Datenschutz</Link>
          {" · "}
          <Link href="/impressum" className="hover:text-gray-400 underline-offset-2 hover:underline">Impressum</Link>
        </p>
      </div>
    </section>
  );
}
