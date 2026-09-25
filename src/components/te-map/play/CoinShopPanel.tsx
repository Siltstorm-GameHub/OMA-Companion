"use client";

// ============================================
// OMA Quest — Münzen-Laden: Besonderes für App-Münzen (Gold bleibt bei den Händlern)
// ============================================

import { useEffect, useState } from "react";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { Coins } from "@/components/te-map/play/Currency";
import type { CoinShopEntry } from "@/lib/dnd/coin-shop";

interface State { coins: number; items: CoinShopEntry[]; titles: string[]; title: string | null }

export default function CoinShopPanel({ refreshKey = 0, onChanged, notify }: { refreshKey?: number; onChanged: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [data, setData] = useState<State | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/coin-shop").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setData(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey, reload]);

  const post = async (body: object, ok?: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/coin-shop", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { say("error", json.error ?? "Fehlgeschlagen."); return; }
      if (ok) say("reward", ok);
      setData(json);
      setReload((n) => n + 1);
      onChanged();
    } finally { setBusy(false); }
  };

  if (!data) return null;
  return (
    <div className="oq-panel p-4 space-y-3">
      <div className="flex items-center gap-2">
        <p className="oq-title">Münzen-Laden</p>
        <Coins n={data.coins} className="ml-auto text-xs text-amber-300 font-bold" />
      </div>
      <p className="text-[11px] text-gray-400">Hier zahlst du mit deinen App-Münzen — für Besonderes, das Gold nicht kauft. Gold verdienst und gibst du nur im Spiel aus.</p>
      {node}
      <ul className="space-y-1.5">
        {data.items.map((i) => (
          <li key={i.id} className="flex items-center gap-2 text-xs text-white">
            <span className="oq-slot w-9 h-9 grid place-items-center text-xl">{i.icon}</span>
            <span className="min-w-0"><b>{i.name}</b><br /><span className="text-gray-400">{i.available ? i.desc : i.reason}</span></span>
            <button type="button" disabled={busy || !i.available || data.coins < i.price} onClick={() => void post({ action: "buy", id: i.id }, `${i.name} gekauft`)} className="oq-btn oq-btn-gold text-xs px-3 py-1.5 ml-auto shrink-0">
              <Coins n={i.price} />
            </button>
          </li>
        ))}
      </ul>
      {data.titles.length > 0 && (
        <div className="space-y-1">
          <p className="oq-title">Meine Ehrentitel</p>
          <div className="flex flex-wrap gap-1.5">
            {data.titles.map((t) => (
              <button key={t} type="button" disabled={busy || data.title === t} onClick={() => void post({ action: "title", title: t })} className={`oq-btn text-xs px-3 py-1.5 ${data.title === t ? "oq-btn-gold" : ""}`}>{t}</button>
            ))}
            <button type="button" disabled={busy || !data.title} onClick={() => void post({ action: "title", title: null })} className="oq-btn text-xs px-3 py-1.5">Stufen-Titel</button>
          </div>
        </div>
      )}
    </div>
  );
}
