"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { formatBerlinDate } from "@/lib/time";
import { MODERATION_TYPE_OPTIONS, type ModerationItemDto } from "./moderation-types";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

const PAGE = 40;

export default function ModerationClient() {
  const [type, setType] = useState<string>("report");
  const [hidden, setHidden] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<ModerationItemDto[] | null>(null);
  const [more, setMore] = useState(false);
  const [tick, setTick] = useState(0);
  const option = MODERATION_TYPE_OPTIONS.find(o => o.id === type);

  const load = useCallback(async (skip: number) => {
    const params = new URLSearchParams({ type, hidden, skip: String(skip) });
    if (q.trim()) params.set("q", q.trim());
    const d = await api<{ items: ModerationItemDto[] }>(`/api/admin/community-jobs/moderation?${params}`);
    setMore(d.items.length === PAGE);
    return d.items;
  }, [type, hidden, q]);

  useEffect(() => {
    setItems(null);
    const handle = setTimeout(() => { load(0).then(setItems).catch(err => { toast.error(err.message); setItems([]); }); }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [load, tick, q]);

  async function act(item: ModerationItemDto, action: "hide" | "unhide" | "delete") {
    let reason: string | undefined;
    if (action === "hide") {
      const r = prompt("Grund fürs Ausblenden (der Autor wird benachrichtigt):");
      if (!r?.trim()) return;
      reason = r;
    } else if (action === "delete" && !confirm("Wirklich entfernen? Das lässt sich nicht rückgängig machen.")) return;
    try {
      await api("/api/admin/community-jobs/moderation", { method: "POST", body: JSON.stringify({ type: item.type, id: item.id, action, reason }) });
      toast.success(action === "hide" ? "Ausgeblendet" : action === "unhide" ? "Wieder eingeblendet" : "Entfernt");
      setTick(t => t + 1);
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select size="sm" value={type} onChange={e => setType(e.target.value)} aria-label="Typ">
          {MODERATION_TYPE_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
        </Select>
        {option?.canHide && (
          <Select size="sm" value={hidden} onChange={e => setHidden(e.target.value)} aria-label="Sichtbarkeit">
            <option value="all">Alle</option>
            <option value="visible">Sichtbar</option>
            <option value="hidden">Ausgeblendet</option>
          </Select>
        )}
        <span className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen: Text oder Autor"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
        </span>
      </div>

      {items === null ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div> : (
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {items.length === 0 && <p className="p-4 text-xs text-gray-600">Nichts gefunden.</p>}
          {items.map(item => (
            <div key={`${item.type}-${item.id}`} className="p-3 flex items-start gap-3">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="text-xs text-gray-200 break-words">
                  {item.url ? <Link href={item.url} className="hover:text-teal-300 transition-colors">{item.title}</Link> : item.title}
                </p>
                <p className="text-[10px] text-gray-500">
                  {item.authorName} · {formatBerlinDate(item.createdAt)}
                  {item.hidden && <Badge tone="danger" className="ml-2">Ausgeblendet</Badge>}
                </p>
                {item.hidden && item.hiddenReason && <p className="text-[10px] text-gray-500">Grund: {item.hiddenReason}</p>}
              </div>
              <div className="flex gap-1.5 shrink-0">
                {item.canHide
                  ? (item.hidden
                    ? <Button size="sm" variant="outline" onClick={() => act(item, "unhide")}>Einblenden</Button>
                    : <Button size="sm" variant="danger" onClick={() => act(item, "hide")}>Ausblenden</Button>)
                  : <Button size="sm" variant="danger" onClick={() => act(item, "delete")}>{item.type === "photo_request" ? "Schließen" : "Entfernen"}</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      {more && items && (
        <Button size="sm" variant="ghost" onClick={async () => { const next = await load(items.length); setItems([...items, ...next]); }}>Mehr laden</Button>
      )}
    </div>
  );
}
