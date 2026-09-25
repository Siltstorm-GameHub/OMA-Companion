"use client";

// ============================================
// OMA Quest — Fähigkeitsbaum (Talente) der Klasse
// ============================================

import { useEffect, useState } from "react";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { abilityOfClass, secondAbilityOfClass } from "@/lib/dnd/combat";
import { ClassIcon } from "@/components/te-map/play/Fx";
import { BRANCH_ICON } from "@/lib/dnd/oq-fx";
import { BRANCHES, BRANCH_LABEL, skillCost, type SkillNode } from "@/lib/dnd/skills";
import type { SkillView } from "@/lib/dnd/skills-server";

export default function SkillTreePanel({ refreshKey = 0, onChanged, notify }: { refreshKey?: number; onChanged: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [view, setView] = useState<SkillView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/skills").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setView(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  if (!view) return null;
  const ownedSet = new Set(view.owned);
  const main = abilityOfClass(view.classId);
  const second = secondAbilityOfClass(view.classId);

  const learn = async (n: SkillNode) => {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/skills", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: n.id }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { say("error", json.error ?? "Fehlgeschlagen."); return; }
      setView(json);
      say("reward", `${n.name} gelernt`);
      onChanged();
    } finally { setBusy(false); }
  };

  const state = (n: SkillNode): "owned" | "available" | "locked" | "cost" => {
    if (ownedSet.has(n.id)) return "owned";
    if (n.tier > 1 && !ownedSet.has(`${n.branch}${n.tier - 1}`)) return "locked";
    return view.points.left >= skillCost(n) ? "available" : "cost";
  };

  return (
    <div className="oq-panel p-4 space-y-3">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className="oq-title flex items-center gap-1.5"><ClassIcon classId={view.classId} size={24} />Talente · {view.className}</p>
        <span className="text-xs font-black text-amber-200">{view.points.left} Talentpunkt{view.points.left === 1 ? "" : "e"} frei</span>
        <span className="text-[11px] text-gray-400">{view.points.spent} von {view.points.total} ausgegeben · ein Punkt je Stufe ab 2</span>
      </div>
      <p className="text-[11px] text-gray-400">
        Klassenfähigkeit: <b className="text-white">{main.icon} {main.name}</b> — {main.desc} Mit „Klassen-Kunst 3“ kommt <b className="text-white">{second.icon} {second.name}</b> dazu. Talente wirken im Kampf; zurücksetzen kannst du sie im Münzen-Laden.
      </p>
      {node}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {BRANCHES.map((b) => (
          <div key={b} className="space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-widest text-violet-300 flex items-center gap-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={BRANCH_ICON(b)} alt="" width={22} height={22} className="object-contain" style={{ width: 22, height: 22 }} />{BRANCH_LABEL[b]}
            </p>
            {view.tree.filter((n) => n.branch === b).map((n) => {
              const st = state(n);
              return (
                <button
                  key={n.id} type="button" disabled={busy || st !== "available"} onClick={() => void learn(n)} aria-label={`${n.name}, ${n.desc}`}
                  className={`w-full text-left rounded-md border-2 px-2 py-1.5 text-xs transition ${st === "owned" ? "border-emerald-400/70 bg-emerald-500/15 text-white" : st === "available" ? "border-amber-300/80 bg-amber-400/10 text-white hover:bg-amber-400/20" : "border-white/10 bg-black/30 text-gray-400"}`}
                >
                  <span className="flex items-center gap-1.5 font-black">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={BRANCH_ICON(n.branch)} alt="" width={16} height={16} className={`object-contain ${st === "owned" ? "" : st === "available" ? "" : "opacity-50"}`} style={{ width: 16, height: 16 }} />{n.name}<span className="ml-auto text-[10px] font-semibold opacity-80">{st === "owned" ? "✓" : `${skillCost(n)} P`}</span></span>
                  <span className="block text-[11px] leading-snug opacity-90">{n.desc}</span>
                  {st === "locked" && <span className="block text-[10px] text-gray-500">Setzt das Talent davor voraus.</span>}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
