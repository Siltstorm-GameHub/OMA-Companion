"use client";
// Detailbereich eines Mitglieds: Kennzahlen, Rolle (mit Bestätigung), Münzen buchen und die
// letzten Buchungen. Stände korrigieren und den ganzen Verlauf gibt es im bestehenden Fenster.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, History, Loader2 } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import { NumberInput } from "@/components/ui/NumberInput";
import UserPointsHistoryModal from "@/components/UserPointsHistoryModal";
import { formatBerlinDate, formatBerlinDateTime } from "@/lib/time";
import { ROLE_INFO, displayName, relativeSince, type AdminUserRow } from "@/lib/admin-users";

type Tx = { id: string; amount: number; reason: string; createdAt: string };

const inputCls = "rounded-lg bg-surface-2 border border-line-strong px-2.5 py-1.5 text-sm text-white focus:border-teal-500/40 focus:outline-none";

export default function UserDetail({ user, meId, now, onBack, onRoleChanged }: {
  user: AdminUserRow;
  meId: string;
  now: number;
  /** Mobil: zurück zur Liste */
  onBack: () => void;
  onRoleChanged: (role: string) => void;
}) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [reload, setReload] = useState(0);
  const [roleBusy, setRoleBusy] = useState(false);
  const [mode, setMode] = useState<"add" | "sub">("add");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [booking, setBooking] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const isMe = user.id === meId;
  const name = displayName(user);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/users/${user.id}/transactions`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancelled) setTxs(d?.transactions ?? []); })
      .catch(() => { if (!cancelled) setTxs([]); });
    return () => { cancelled = true; };
  }, [user.id, reload]);

  async function changeRole(role: string) {
    if (role === user.role || isMe) return;
    const to = ROLE_INFO[role];
    const ok = await confirm({
      title: `${name} wird ${to.label}`,
      description: `${to.rights}${role === "admin" ? "\n\nAdmins können auch anderen Rollen und Münzen geben — nur an Personen, denen du voll vertraust." : ""}`,
      confirmLabel: `Zu ${to.label} machen`,
      variant: role === "admin" ? "danger" : "default",
    });
    if (!ok) return;
    setRoleBusy(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, role }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(data.error ?? "Rolle konnte nicht geändert werden"); return; }
      toast.success(`${name} ist jetzt ${to.label}`);
      onRoleChanged(role);
      router.refresh();
    } finally {
      setRoleBusy(false);
    }
  }

  async function book() {
    const num = parseInt(amount);
    if (!num || num <= 0) { toast.error("Betrag eingeben"); return; }
    if (!reason.trim()) { toast.error("Grund eingeben — er steht im Verlauf des Mitglieds"); return; }
    const delta = mode === "sub" ? -num : num;
    if (mode === "sub" && num > user.points) {
      const ok = await confirm({ title: "Mehr abziehen als vorhanden?", description: `${name} hat nur ${user.points.toLocaleString("de-DE")} Münzen. Der Stand wird dann negativ.`, confirmLabel: "Trotzdem abziehen", variant: "danger" });
      if (!ok) return;
    }
    setBooking(true);
    try {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, amount: delta, reason: reason.trim() }),
      });
      if (!res.ok) { toast.error("Buchung fehlgeschlagen"); return; }
      toast.success(`${delta > 0 ? "+" : ""}${delta} Münzen für ${name}`, { description: reason.trim() });
      setAmount(""); setReason("");
      setReload(n => n + 1);
      router.refresh();
    } finally {
      setBooking(false);
    }
  }

  const status = user.leftServerAt
    ? `Ausgetreten am ${formatBerlinDate(user.leftServerAt, { day: "2-digit", month: "2-digit", year: "numeric" })}`
    : user.hasLogin ? `Zuletzt aktiv ${relativeSince(user.lastLoginAt, now)}` : "Noch nie eingeloggt";

  return (
    <section aria-label={`Details zu ${name}`} className="glass rounded-2xl p-4 space-y-4">
      {ConfirmDialogElement}
      <button type="button" onClick={onBack} className="lg:hidden inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300">
        <ArrowLeft className="w-3.5 h-3.5" /> Alle Mitglieder
      </button>

      <div className="flex items-center gap-3">
        {user.image
          ? <img src={user.image} alt="" width={40} height={40} className="w-10 h-10 rounded-full ring-1 ring-white/10" />
          : <span className="w-10 h-10 rounded-full bg-rose-600/40 flex items-center justify-center text-sm font-semibold text-rose-300">{name[0]?.toUpperCase()}</span>}
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold text-white">{name}{isMe && <span className="font-normal text-gray-500"> (du)</span>}</p>
          <p className="truncate text-xs text-gray-500">
            {status} · dabei seit {formatBerlinDate(user.createdAt, { month: "long", year: "numeric" })}
          </p>
          <p className="truncate text-xs text-gray-600">
            {user.email ?? "keine E-Mail"}{user.discordId && <> · Discord <span className="font-mono">{user.discordId}</span></>}
          </p>
        </div>
        <Link href={`/profile/${user.id}`} title="Profil öffnen" aria-label="Profil öffnen"
          className="w-8 h-8 shrink-0 rounded-lg text-gray-400 hover:text-white hover:bg-line flex items-center justify-center">
          <ExternalLink className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[["Münzen", user.points], ["Rang-Punkte", user.rankPoints], ["Events", user.eventCount]].map(([label, v]) => (
          <div key={label as string} className="rounded-xl bg-surface-2 px-3 py-2">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-sm font-semibold text-white tabular-nums">{(v as number).toLocaleString("de-DE")}</p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-400">Rolle</p>
        <div className="flex gap-1.5" role="radiogroup" aria-label="Rolle">
          {Object.entries(ROLE_INFO).map(([key, info]) => {
            const on = user.role === key;
            return (
              <button key={key} type="button" role="radio" aria-checked={on} disabled={roleBusy || isMe}
                onClick={() => changeRole(key)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${
                  on ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/30" : "border border-line text-gray-400 hover:text-white hover:bg-line disabled:opacity-50"
                }`}>
                {roleBusy && !on ? <Loader2 className="w-3 h-3 inline animate-spin" /> : info.label}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-gray-500">
          {isMe ? "Deine eigene Rolle kannst du nicht ändern — so sperrst du dich nicht versehentlich aus." : ROLE_INFO[user.role]?.rights}
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-400">Münzen gutschreiben oder abziehen</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex rounded-lg overflow-hidden border border-line" role="radiogroup" aria-label="Richtung">
            {(["add", "sub"] as const).map(k => (
              <button key={k} type="button" role="radio" aria-checked={mode === k} onClick={() => setMode(k)}
                className={`px-2.5 py-1.5 text-xs font-bold ${mode === k ? (k === "add" ? "bg-emerald-500/20 text-emerald-300" : "bg-red-500/20 text-red-300") : "text-gray-500 hover:text-gray-300"}`}>
                {k === "add" ? "+" : "−"}
              </button>
            ))}
          </div>
          <NumberInput min={1} placeholder="Anzahl" value={amount} onChange={e => setAmount(e.target.value)} className={`${inputCls} w-24`} />
          <input value={reason} onChange={e => setReason(e.target.value)} onKeyDown={e => e.key === "Enter" && book()}
            placeholder="Grund (sieht das Mitglied)" maxLength={200} className={`${inputCls} min-w-0 flex-1`} />
          <button type="button" onClick={book} disabled={booking}
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 hover:bg-teal-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">
            {booking && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Buchen
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-gray-400">Letzte Buchungen</p>
        {txs === null ? (
          <p className="text-xs text-gray-600">Lädt…</p>
        ) : txs.length === 0 ? (
          <p className="text-xs text-gray-600">Noch keine Buchungen.</p>
        ) : (
          <ul className="divide-y divide-line">
            {txs.slice(0, 5).map(t => (
              <li key={t.id} className="flex items-center gap-2 py-1.5 text-xs">
                <span className={`w-14 shrink-0 text-right tabular-nums font-semibold ${t.amount >= 0 ? "text-emerald-300" : "text-red-300"}`}>
                  {t.amount > 0 ? "+" : ""}{t.amount.toLocaleString("de-DE")}
                </span>
                <span className="min-w-0 flex-1 truncate text-gray-300">{t.reason}</span>
                <span className="shrink-0 text-gray-600">{formatBerlinDateTime(t.createdAt, { day: "2-digit", month: "2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
        <button type="button" onClick={() => setHistoryOpen(true)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-300 hover:text-teal-200">
          <History className="w-3.5 h-3.5" /> Ganzer Verlauf und Stände korrigieren
        </button>
      </div>

      {historyOpen && (
        <UserPointsHistoryModal key={user.id} userId={user.id} userName={name} userImage={user.image} defaultOpen
          onClose={() => { setHistoryOpen(false); setReload(n => n + 1); router.refresh(); }} />
      )}
    </section>
  );
}
