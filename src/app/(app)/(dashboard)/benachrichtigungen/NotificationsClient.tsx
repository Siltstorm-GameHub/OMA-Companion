"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell, Check, Loader2, Settings, Trash2 } from "@/components/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonClasses } from "@/components/ui/button-styles";
import { RelativeTime } from "@/components/RelativeTime";

type Notification = { id: string; type: string; title: string; body: string; url?: string | null; read: boolean; createdAt: string };

const ICONS: Record<string, string> = {
  badge: "🏅", quest: "⭐", event_result: "✅", event_start: "⏰", points: "⭐",
  coins: "💰", clip: "🎬", admin: "📢", game: "🎮", event_comment: "💬",
};

type Filter = "all" | "unread";

/**
 * Benachrichtigungen als ganze Seite: dieselbe Quelle wie das Panel hinter der Glocke
 * (/api/notifications), aber mit Filter "Ungelesen", alles lesen/löschen und Link zu den Einstellungen.
 */
export default function NotificationsClient() {
  const router = useRouter();
  const [items, setItems] = useState<Notification[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) { setItems([]); return; }
      const data = (await res.json()) as { notifications: Notification[] };
      setItems(data.notifications);
    } catch { setItems([]); }
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- einmal laden beim Öffnen
  useEffect(() => { load(); }, [load]);

  const post = (url: string, body: unknown) =>
    fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});

  async function open(n: Notification) {
    if (!n.read) {
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? null);
      await post("/api/notifications/read", { id: n.id });
    }
    if (n.url) router.push(n.url);
  }
  async function markAll() {
    setItems((prev) => prev?.map((x) => ({ ...x, read: true })) ?? null);
    await post("/api/notifications/read", { all: true });
  }
  async function remove(id: string) {
    setItems((prev) => prev?.filter((x) => x.id !== id) ?? null);
    await post("/api/notifications/delete", { id });
  }
  async function removeAll() {
    if (!window.confirm("Alle Benachrichtigungen löschen?")) return;
    setItems([]);
    await post("/api/notifications/delete", { all: true });
  }

  const unread = items?.filter((n) => !n.read).length ?? 0;
  const shown = (items ?? []).filter((n) => filter === "all" || !n.read);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Benachrichtigungen"
        description={unread > 0 ? `${unread} ungelesen` : "Alles gelesen"}
        actions={<Link href="/profile?tab=einstellungen" className={buttonClasses("secondary", "md")}><Settings className="w-4 h-4" /> Einstellungen</Link>}
      />

      <div className="flex flex-wrap items-center gap-2">
        {(["all", "unread"] as const).map((f) => (
          <button key={f} type="button" aria-pressed={filter === f} onClick={() => setFilter(f)}
            className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              filter === f ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-gray-300 hover:border-line-strong hover:bg-surface-2"
            }`}>
            {f === "all" ? "Alle" : `Ungelesen${unread ? ` (${unread})` : ""}`}
          </button>
        ))}
        <div className="ml-auto flex gap-2">
          {unread > 0 && <button type="button" onClick={markAll} className={buttonClasses("ghost", "sm")}><Check className="w-4 h-4" /> Alle gelesen</button>}
          {(items?.length ?? 0) > 0 && <button type="button" onClick={removeAll} className={buttonClasses("ghost", "sm")}><Trash2 className="w-4 h-4" /> Alle löschen</button>}
        </div>
      </div>

      {items === null ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary-fg" /></div>
      ) : shown.length === 0 ? (
        <div className="rounded-card border border-line bg-surface px-6 py-12 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-card bg-primary-soft text-primary-fg"><Bell className="size-6" /></span>
          <p className="text-base font-extrabold text-fg">{filter === "unread" ? "Nichts Ungelesenes" : "Noch keine Benachrichtigungen"}</p>
          <p className="mt-1 text-sm text-muted">Hier landet alles zu deinen Events, Münzen, Quests und Clips.</p>
        </div>
      ) : (
        <ul className="rounded-card border border-line bg-surface divide-y divide-line overflow-hidden">
          {shown.map((n) => (
            <li key={n.id} className={`group flex items-start gap-3 px-4 py-3.5 ${n.read ? "" : "bg-primary-soft/40"}`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-control bg-surface-2 text-lg" aria-hidden>{ICONS[n.type] ?? "🔔"}</span>
              <button type="button" onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                <span className="flex items-center gap-2">
                  <span className={`truncate text-sm ${n.read ? "font-semibold text-gray-200" : "font-extrabold text-fg"}`}>{n.title}</span>
                  {!n.read && <span className="size-2 shrink-0 rounded-full bg-live" aria-label="ungelesen" />}
                </span>
                <span className="mt-0.5 block text-sm text-muted line-clamp-2">{n.body}</span>
                <span className="mt-1 block text-xs text-subtle"><RelativeTime date={n.createdAt} /></span>
              </button>
              <button type="button" onClick={() => remove(n.id)} aria-label="Benachrichtigung löschen"
                className="grid size-9 shrink-0 place-items-center rounded-control text-subtle hover:bg-surface-2 hover:text-fg">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
