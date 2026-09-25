"use client";

// ============================================
// OMA Quest — Kampf: Begegnung wählen, Runden spielen, Ergebnis
// ============================================

import { useEffect, useRef, useState } from "react";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { Gold } from "@/components/te-map/play/Currency";
import { AP_PER_ROUND, abilitiesOf, getMonster, type CombatAction, type CombatState, type Fighter, type Monster } from "@/lib/dnd/combat";
import { getItem } from "@/lib/dnd/items";
import GroupFightPanel, { type FightCall, type GroupSnapshot } from "@/components/te-map/play/GroupFightPanel";

interface View { state: CombatState | null; encounters: Monster[]; biome: string; level: number; hero: Fighter }

const BIOME_LABEL: Record<string, string> = { temperate: "gemäßigtes Land", cold: "Kältezone", dry: "Trockengebiet" };

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-3 rounded bg-black/50 border border-white/10 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

export default function CombatPanel({ refreshKey = 0, onChanged, notify, gf, groupCall, groupBusy = false, myCardId }: { refreshKey?: number; onChanged: () => void; notify?: Notify; gf?: GroupSnapshot | null; groupCall?: FightCall; groupBusy?: boolean; myCardId?: string | null }) {
  const { notify: say, node } = useNotice(notify);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/combat").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setView(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);
  useEffect(() => { logEnd.current?.scrollIntoView({ block: "nearest" }); }, [view?.state?.log.length]);

  const send = async (body: object) => {
    setBusy(true);
    try {
      const res = await fetch("/api/dnd/combat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { say("error", json.error ?? "Fehlgeschlagen."); return; }
      setView(json);
      // Kampf beendet: Charakterbogen (XP, Gold, Rucksack) neu laden
      if (json.state && json.state.status !== "active") onChanged();
    } finally { setBusy(false); }
  };
  const act = (a: CombatAction) => void send({ action: "act", act: a });

  // Gruppenkampf (Vorraum, laufend oder Ergebnis) hat Vorrang
  if (gf?.fight && groupCall && myCardId && (gf.fight.myStatus === "joined" || (gf.fight.myStatus === "invited" && gf.fight.status === "LOBBY"))) {
    return (
      <>
        {node}
        <GroupFightPanel view={gf.fight} myId={myCardId} call={groupCall} busy={groupBusy} />
      </>
    );
  }
  if (!view) return null;
  const s = view.state;
  const canGroup = !!gf?.group.inParty && gf.group.here >= 2 && !!groupCall;

  // ── Begegnung wählen ──
  if (!s) {
    return (
      <div className="oq-panel p-4 space-y-3">
        <div className="flex items-baseline gap-2">
          <p className="oq-title">Begegnungen</p>
          <span className="text-[11px] text-gray-400">in deiner Umgebung ({BIOME_LABEL[view.biome] ?? view.biome})</span>
        </div>
        <p className="text-[11px] text-gray-400">Rundenkampf: 3 Aktionen pro Runde, dann ist das Monster dran. Bei einer Niederlage verlierst du 10 % Gold. Zu schwache Gegner geben weniger Erfahrung.</p>
        {node}
        <ul className="space-y-1.5">
          {view.encounters.map((m) => {
            const diff = m.level - view.level;
            return (
              <li key={m.id} className="flex items-center gap-2 text-xs text-white">
                <span className="oq-slot w-10 h-10 grid place-items-center text-2xl">{m.emoji}</span>
                <span className="min-w-0"><b>{m.name}</b> <span className="text-gray-500">Stufe {m.level} · {m.hp} LP · RK {m.ac}</span><br />
                  <span className="text-gray-400">{m.blurb}</span> <span className={diff >= 2 ? "text-red-300" : diff <= -2 ? "text-gray-500" : "text-amber-200"}>{diff >= 2 ? "gefährlich" : diff <= -2 ? "leicht" : "ebenbürtig"}</span>
                </span>
                <span className="ml-auto shrink-0 flex flex-col gap-1">
                  <button type="button" disabled={busy} onClick={() => void send({ action: "start", monster: m.id })} className="oq-btn oq-btn-gold text-xs px-3 py-1.5">⚔️ Allein</button>
                  {canGroup && <button type="button" disabled={busy || groupBusy} onClick={() => void groupCall!({ action: "start", monster: m.id })} className="oq-btn text-xs px-3 py-1.5">👥 Mit Gruppe</button>}
                </span>
              </li>
            );
          })}
          {view.encounters.length === 0 && <li className="text-xs text-gray-500">Hier lauert gerade nichts, das zu deiner Stufe passt.</li>}
        </ul>
        {gf?.group.inParty && (
          <div className="space-y-1.5 pt-2 border-t border-white/10">
            <p className="oq-title">Raid-Bosse</p>
            {!gf.group.raid ? (
              <p className="text-[11px] text-gray-400">Raid-Bosse brauchen den Raid-Modus deiner Gruppe (bis zu 8 Helden). Der Gruppenleiter schaltet ihn im Gruppen-Tab ein.</p>
            ) : (
              <ul className="space-y-1.5">
                {gf.raidBosses.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 text-xs text-white">
                    <span className="oq-slot w-10 h-10 grid place-items-center text-2xl">{m.emoji}</span>
                    <span className="min-w-0"><b>{m.name}</b> <span className="text-gray-500">Stufe {m.level} · mind. {m.raid?.min} Helden</span><br /><span className="text-gray-400">{m.blurb}</span></span>
                    <button type="button" disabled={busy || groupBusy || !canGroup} onClick={() => void groupCall!({ action: "start", monster: m.id })} className="oq-btn oq-btn-gold text-xs px-3 py-1.5 ml-auto shrink-0">👥 Raid starten</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Kampf ──
  const m = getMonster(s.monsterId);
  const { main: ab, second } = abilitiesOf(s.fighter);
  const cdOf = (id: string) => s.cooldowns?.[id] ?? 0;
  const active = s.status === "active";
  return (
    <div className="oq-panel p-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="oq-slot p-3 space-y-1">
          <p className="text-xs font-black text-white">🧙 {s.fighter.name} <span className="text-gray-500 font-normal">RK {s.fighter.ac + (s.guard > 0 ? 3 : 0)}{s.guard > 0 ? " (Schild)" : ""}</span></p>
          <Bar value={s.hp} max={s.fighter.maxHp} color="bg-emerald-500" />
          <p className="text-[11px] text-gray-300">{s.hp} / {s.fighter.maxHp} LP</p>
        </div>
        <div className="oq-slot p-3 space-y-1">
          <p className="text-xs font-black text-white">{m?.emoji} {m?.name} <span className="text-gray-500 font-normal">RK {m?.ac}{s.taunt > 0 ? " · verspottet" : ""}</span></p>
          <Bar value={s.monsterHp} max={m?.hp ?? 1} color="bg-red-500" />
          <p className="text-[11px] text-gray-300">{s.monsterHp} / {m?.hp} LP</p>
        </div>
      </div>

      <div className="oq-slot p-2 h-40 overflow-y-auto space-y-0.5 text-[11px] text-gray-200" aria-live="polite">
        {s.log.map((l, i) => <p key={i} className={i === s.log.length - 1 ? "text-white font-semibold" : ""}>{l}</p>)}
        <div ref={logEnd} />
      </div>

      {node}
      {active ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-white">
            <span className="font-black">Runde {s.round}</span>
            <span className="flex gap-1" aria-label={`${s.ap} Aktionspunkte`}>
              {Array.from({ length: AP_PER_ROUND }, (_, i) => <span key={i} className={`w-3 h-3 rounded-full border border-amber-300 ${i < s.ap ? "bg-amber-300" : "bg-transparent"}`} />)}
            </span>
            <span className="text-gray-400">{s.ap} Aktion{s.ap === 1 ? "" : "en"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button type="button" disabled={busy || s.ap < 1} onClick={() => act("attack")} className="oq-btn text-xs px-3 py-2">⚔️ Angriff <span className="text-gray-500">1</span></button>
            <button type="button" disabled={busy || s.ap < ab.ap || cdOf(ab.id) > 0} onClick={() => act("ability")} title={ab.desc} className="oq-btn oq-btn-gold text-xs px-3 py-2">
              {ab.icon} {ab.name} <span className="opacity-70">{ab.ap}{cdOf(ab.id) > 0 ? ` · ${cdOf(ab.id)}R` : ""}</span>
            </button>
            {second && (
              <button type="button" disabled={busy || s.ap < second.ap || cdOf(second.id) > 0} onClick={() => act("ability2")} title={second.desc} className="oq-btn oq-btn-gold text-xs px-3 py-2">
                {second.icon} {second.name} <span className="opacity-70">{second.ap}{cdOf(second.id) > 0 ? ` · ${cdOf(second.id)}R` : ""}</span>
              </button>
            )}
            <button type="button" disabled={busy || s.ap < 1} onClick={() => act("defend")} className="oq-btn text-xs px-3 py-2">🛡️ Deckung <span className="text-gray-500">1</span></button>
            <button type="button" disabled={busy || s.ap < 1} onClick={() => act("flee")} className="oq-btn text-xs px-3 py-2">🏃 Fliehen <span className="text-gray-500">1</span></button>
            <button type="button" disabled={busy} onClick={() => act("end")} className="oq-btn text-xs px-3 py-2 ml-auto">Runde beenden</button>
          </div>
          <p className="text-[10px] text-gray-500">{ab.desc}{second ? ` · ${second.desc}` : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className={`text-sm font-black ${s.status === "won" ? "text-emerald-300" : s.status === "fled" ? "text-amber-200" : "text-red-300"}`}>
            {s.status === "won" ? "🏆 Sieg!" : s.status === "fled" ? "🏃 Geflohen" : "💀 Niederlage"}
          </p>
          {s.result && s.status === "won" && (
            <p className="text-xs text-gray-200 flex flex-wrap gap-x-3 gap-y-1 items-center">
              <b>+{s.result.xp} XP</b>
              {s.result.gold > 0 && <Gold n={s.result.gold} />}
              {s.result.items.map((k, i) => <span key={i}>{getItem(k)?.emoji} {getItem(k)?.name ?? k}</span>)}
              {s.result.levelUp && <b className="text-violet-300">⭐ Stufe {s.result.levelUp}!</b>}
            </p>
          )}
          {s.result && s.status === "lost" && s.result.goldLost > 0 && <p className="text-xs text-gray-300">Du verlierst <Gold n={s.result.goldLost} />.</p>}
          <button type="button" disabled={busy} onClick={() => void send({ action: "close" })} className="oq-btn oq-btn-gold text-xs px-3 py-1.5">Weiter</button>
        </div>
      )}
    </div>
  );
}
