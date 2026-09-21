"use client";
import { useCallback, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { formatBerlinDateTime } from "@/lib/time";
import { ADMIN_ACTIONS, adminActionLabel } from "@/lib/community-admin-actions";
import { getCommunityJob } from "@/lib/community-jobs";

interface Entry {
  id: string; actorName: string | null; action: string; targetType: string | null; targetLabel: string | null;
  jobKey: string | null; reason: string | null; detail: string | null; createdAt: string;
}

const PAGE = 50;

export default function AuditClient() {
  const [action, setAction] = useState("");
  const [q, setQ] = useState("");
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [more, setMore] = useState(false);

  const load = useCallback(async (skip: number) => {
    const params = new URLSearchParams({ skip: String(skip) });
    if (action) params.set("action", action);
    if (q.trim()) params.set("q", q.trim());
    const res = await fetch(`/api/admin/community-jobs/audit?${params}`);
    if (!res.ok) throw new Error("Konnte nicht geladen werden");
    const d = (await res.json()) as { entries: Entry[] };
    setMore(d.entries.length === PAGE);
    return d.entries;
  }, [action, q]);

  useEffect(() => {
    setEntries(null);
    const handle = setTimeout(() => { load(0).then(setEntries).catch(() => setEntries([])); }, q ? 300 : 0);
    return () => clearTimeout(handle);
  }, [load, q]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select size="sm" value={action} onChange={e => setAction(e.target.value)} aria-label="Aktion">
          <option value="">Alle Aktionen</option>
          {Object.entries(ADMIN_ACTIONS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
        <span className="relative flex-1 min-w-[10rem]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Suchen: Team-Mitglied, Betroffene, Grund"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg pl-7 pr-2 py-1.5 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
        </span>
      </div>

      {entries === null ? <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div> : (
        <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
          {entries.length === 0 && <p className="p-4 text-xs text-gray-600">Keine Einträge.</p>}
          {entries.map(e => (
            <div key={e.id} className="p-3 space-y-0.5">
              <p className="text-xs text-gray-200">
                <span className="text-white font-semibold">{adminActionLabel(e.action)}</span>
                {e.targetLabel && <> — {e.targetLabel}</>}
                {e.jobKey && <span className="text-gray-500"> · {getCommunityJob(e.jobKey)?.label ?? e.jobKey}</span>}
              </p>
              <p className="text-[10px] text-gray-500">{e.actorName ?? "?"} · {formatBerlinDateTime(e.createdAt, { dateStyle: "short", timeStyle: "short" })}</p>
              {e.reason && <p className="text-[11px] text-gray-400">Grund: {e.reason}</p>}
              {e.detail && <p className="text-[10px] text-gray-600 break-all">{e.detail.length > 180 ? `${e.detail.slice(0, 180)}…` : e.detail}</p>}
            </div>
          ))}
        </div>
      )}
      {more && entries && <Button size="sm" variant="ghost" onClick={async () => setEntries([...entries, ...(await load(entries.length))])}>Mehr laden</Button>}
    </div>
  );
}
