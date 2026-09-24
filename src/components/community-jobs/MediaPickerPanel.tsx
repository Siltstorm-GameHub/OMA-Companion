"use client";
import { useEffect, useState } from "react";
import { X } from "@/components/icons";
import { isVideoUrl } from "@/lib/upload-limits";

/** Kleines Auswahlfeld für Mediathek-Bilder (durchsuchbar) — z.B. um Bilder in eine Anleitung einzufügen. */

export interface PickedAsset { id: string; url: string; caption: string | null }

export default function MediaPickerPanel({ onPick, onClose }: { onPick: (asset: PickedAsset) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [assets, setAssets] = useState<PickedAsset[]>([]);

  useEffect(() => {
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ take: "24" });
      if (q.trim()) params.set("q", q.trim());
      fetch(`/api/community-jobs/media?${params}`).then(r => (r.ok ? r.json() : { assets: [] }))
        .then((d: { assets: PickedAsset[] }) => setAssets(d.assets.filter(a => !isVideoUrl(a.url)))).catch(() => {});
    }, q ? 250 : 0);
    return () => clearTimeout(handle);
  }, [q]);

  return (
    <div className="rounded-lg border border-white/10 bg-gray-900/95 p-2 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Mediathek durchsuchen…" aria-label="Mediathek durchsuchen"
          className="flex-1 bg-white/[0.04] border border-white/10 rounded px-2 py-1 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
        <button onClick={onClose} aria-label="Schließen" className="text-gray-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>
      </div>
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
        {assets.map(a => (
          <button key={a.id} title={a.caption ?? undefined} onClick={() => onPick(a)} className="rounded overflow-hidden border-2 border-transparent hover:border-teal-400">
            {/* eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau */}
            <img src={a.url} alt="" className="w-full h-14 object-cover" />
          </button>
        ))}
        {assets.length === 0 && <p className="col-span-full text-[11px] text-gray-600">Nichts gefunden.</p>}
      </div>
    </div>
  );
}
