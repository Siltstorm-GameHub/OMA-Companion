"use client";
// Nutzer & Rollen: Suche, Filter und Sortierung links, Details des gewählten Mitglieds rechts
// (mobil nacheinander). Rolle ändern und Münzen buchen passiert im Detailbereich.

import { useState, type ReactNode } from "react";
import { Search, X } from "@/components/icons";
import {
  USER_FILTERS, USER_SORTS, ROLE_INFO, displayName, filterCounts, relativeSince, visibleUsers,
  type AdminUserRow, type UserFilter, type UserSort,
} from "@/lib/admin-users";
import UserDetail from "./UserDetail";

const ROLE_TONE: Record<string, string> = {
  admin: "bg-rose-500/15 text-rose-300",
  moderator: "bg-violet-500/15 text-violet-300",
};

export default function AdminUsersClient({ users: initial, meId, syncTools }: {
  users: AdminUserRow[];
  meId: string;
  /** Discord-Abgleich (selten gebraucht) — im Menü oben */
  syncTools: ReactNode;
}) {
  // Zeitpunkt einmal festhalten (Render bleibt rein)
  const [now] = useState(() => Date.now());
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<UserFilter>("all");
  const [sort, setSort] = useState<UserSort>("recent");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Rollenwechsel sofort in der Liste zeigen (router.refresh lädt danach frisch)
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({});
  const users = initial.map(u => (roleOverride[u.id] ? { ...u, role: roleOverride[u.id] } : u));

  const counts = filterCounts(users, now);
  const shown = visibleUsers(users, { query, filter, sort, now });
  const selected = users.find(u => u.id === selectedId) ?? null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <label className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <span className="sr-only">Mitglieder suchen</span>
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Name, Discord-ID oder E-Mail"
            className="w-full rounded-xl bg-surface-2 border border-line-strong pl-8 pr-8 py-2 text-sm text-white focus:border-teal-500/40 focus:outline-none" />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label="Suche leeren"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          )}
        </label>
        <details className="relative">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden rounded-xl border border-line-strong px-3 py-2 text-xs font-semibold text-gray-300 hover:bg-line">
            Discord abgleichen
          </summary>
          <div className="absolute right-0 top-full z-30 mt-1 w-max max-w-[90vw] space-y-2 rounded-xl border border-line-strong bg-gray-900 p-3 shadow-xl">
            {syncTools}
          </div>
        </details>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {USER_FILTERS.map(f => (
          <button key={f.key} type="button" onClick={() => setFilter(f.key)} aria-pressed={filter === f.key}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              filter === f.key ? "bg-teal-500/15 text-teal-200 ring-1 ring-teal-500/30" : "border border-line text-gray-400 hover:text-white"
            }`}>
            {f.label} <span className="tabular-nums text-gray-500">{counts[f.key]}</span>
          </button>
        ))}
        <label className="ml-auto flex items-center gap-1.5 text-xs text-gray-500">
          Sortieren
          <select value={sort} onChange={e => setSort(e.target.value as UserSort)}
            className="rounded-lg bg-surface-2 border border-line-strong px-2 py-1 text-xs text-white">
            {USER_SORTS.map(s => <option key={s.key} value={s.key} className="bg-gray-900">{s.label}</option>)}
          </select>
        </label>
      </div>

      <div className="grid gap-3 items-start lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]">
        <section aria-label="Mitglieder" className={`glass rounded-2xl overflow-hidden ${selected ? "hidden lg:block" : ""}`}>
          {shown.length === 0 ? (
            <p className="p-6 text-center text-sm text-gray-500">Niemand gefunden.</p>
          ) : (
            <ul className="divide-y divide-line">
              {shown.map(u => {
                const name = displayName(u);
                const on = u.id === selectedId;
                const sub = u.leftServerAt
                  ? "ausgetreten"
                  : u.hasLogin ? `${relativeSince(u.lastLoginAt, now)} · ${u.eventCount} ${u.eventCount === 1 ? "Event" : "Events"}`
                  : "noch nie eingeloggt";
                return (
                  <li key={u.id}>
                    <button type="button" onClick={() => setSelectedId(on ? null : u.id)} aria-pressed={on}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${on ? "bg-teal-500/[0.08]" : "hover:bg-surface-2"} ${!u.hasLogin || u.leftServerAt ? "opacity-60" : ""}`}>
                      {u.image
                        ? <img src={u.image} alt="" loading="lazy" width={28} height={28} className="w-7 h-7 rounded-full ring-1 ring-white/10 shrink-0" />
                        : <span className="w-7 h-7 shrink-0 rounded-full bg-rose-600/40 flex items-center justify-center text-[11px] font-semibold text-rose-300">{name[0]?.toUpperCase()}</span>}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{name}{u.id === meId && <span className="font-normal text-gray-500"> (du)</span>}</span>
                        <span className="block truncate text-[11px] text-gray-500">{sub}</span>
                      </span>
                      {ROLE_TONE[u.role] && (
                        <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${ROLE_TONE[u.role]}`}>
                          {u.role === "moderator" ? "Mod" : ROLE_INFO[u.role].label}
                        </span>
                      )}
                      {u.leftServerAt && <span className="shrink-0 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Ausgetreten</span>}
                      <span className="w-14 shrink-0 text-right text-xs tabular-nums text-gray-300">{u.points.toLocaleString("de-DE")}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {selected ? (
          <div className="lg:sticky lg:top-4">
            <UserDetail key={selected.id} user={selected} meId={meId} now={now}
              onBack={() => setSelectedId(null)}
              onRoleChanged={role => setRoleOverride(r => ({ ...r, [selected.id]: role }))} />
          </div>
        ) : (
          <p className="hidden lg:block glass rounded-2xl p-6 text-center text-sm text-gray-500">
            Mitglied antippen, um Rolle, Münzen und Verlauf zu sehen.
          </p>
        )}
      </div>
    </div>
  );
}
