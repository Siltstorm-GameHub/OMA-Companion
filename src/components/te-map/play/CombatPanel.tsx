"use client";

// ============================================
// OMA Quest — Kampf: Begegnung wählen, Runden spielen, Ergebnis
// ============================================

import { useEffect, useRef, useState } from "react";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { Gold } from "@/components/te-map/play/Currency";
import { AP_PER_ROUND, getMonster, type CombatAction, type CombatState, type Fighter, type Monster } from "@/lib/dnd/combat";
import { getItem } from "@/lib/dnd/items";
import MonsterSprite from "@/components/te-map/play/MonsterSprite";
import { useFightSounds, useFxEvents } from "@/components/te-map/play/Fx";
import { BattleLog, BattleStage, CommandBar, abilityCards, type Cmd, type StageHero } from "@/components/te-map/play/BattleStage";
import type { TeCharacterConfig } from "@/lib/te-character";
import { BIOME_BACKDROP, type BackdropKey } from "@/lib/dnd/oq-backdrop";
import GroupFightPanel, { type FightCall, type GroupSnapshot } from "@/components/te-map/play/GroupFightPanel";

interface View { state: CombatState | null; encounters: Monster[]; biome: string; level: number; hero: Fighter; character: TeCharacterConfig }

const BIOME_LABEL: Record<string, string> = { temperate: "gemäßigtes Land", cold: "Kältezone", dry: "Trockengebiet" };

export default function CombatPanel({ refreshKey = 0, onChanged, notify, gf, groupCall, groupBusy = false, myCardId, backdrop }: { refreshKey?: number; onChanged: () => void; notify?: Notify; gf?: GroupSnapshot | null; groupCall?: FightCall; groupBusy?: boolean; myCardId?: string | null; backdrop?: BackdropKey }) {
  const { notify: say, node } = useNotice(notify);
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState(false);
  const logEnd = useRef<HTMLDivElement>(null);
  const fx = useFxEvents(view?.state?.log ?? [], [], () => view?.state?.fighter.classId);
  useFightSounds(view?.state?.monsterId, view?.state?.status);

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
        <GroupFightPanel view={gf.fight} myId={myCardId} call={groupCall} busy={groupBusy} backdrop={backdrop} />
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
                <span className="oq-slot w-12 h-12 grid place-items-center text-2xl overflow-hidden"><MonsterSprite monsterId={m.id} box={36} /></span>
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
                    <span className="oq-slot w-12 h-12 grid place-items-center text-2xl overflow-hidden"><MonsterSprite monsterId={m.id} box={36} /></span>
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

  // ── Kampf: Bühne, Verlauf, Befehle ──
  const m = getMonster(s.monsterId);
  const active = s.status === "active";
  const heroes: StageHero[] = [{ key: "me", name: s.fighter.name, classId: s.fighter.classId, character: view.character, hp: s.hp, maxHp: s.fighter.maxHp, ac: s.fighter.ac + (s.guard > 0 ? 3 : 0), guard: s.guard > 0, shield: s.shield ?? 0, down: s.hp <= 0, left: false, active: true, mine: true }];
  const cmds: Cmd[] = [
    { key: "attack", label: "Angriff", icon: "⚔️", cost: 1, disabled: s.ap < 1, onClick: () => act("attack") },
    { key: "defend", label: "Deckung", icon: "🛡️", cost: 1, disabled: s.ap < 1, hint: "Deckung: +3 Rüstung bis zur nächsten Runde.", onClick: () => act("defend") },
    { key: "flee", label: "Fliehen", icon: "🏃", cost: 1, disabled: s.ap < 1, hint: "Fliehen: Geschicksprobe gegen die Stufe des Monsters.", onClick: () => act("flee") },
  ];
  return (
    <div className="oq-panel p-3 sm:p-4 space-y-2.5">
      <BattleStage
        monsterId={s.monsterId} monsterHp={s.monsterHp} monsterMaxHp={m?.hp ?? 1} monsterStatus={{ ...(s.mStatus ?? {}), taunt: s.taunt }}
        backdrop={backdrop ?? BIOME_BACKDROP[view.biome] ?? "plains"} heroes={heroes} fx={fx} status={s.status}
      />
      {node}
      {active ? (
        <CommandBar round={s.round} ap={s.ap} apMax={AP_PER_ROUND} cmds={cmds} abilities={abilityCards(s.fighter, s.cooldowns ?? {}, s.ap, (a) => act(a as CombatAction))} onEnd={() => act("end")} busy={busy} endLabel="Runde beenden" />
      ) : (
        <div className="space-y-2">
          {s.result && s.status === "won" && (
            <p className="text-xs text-gray-200 flex flex-wrap gap-x-3 gap-y-1 items-center">
              <b>+{s.result.xp} XP</b>
              {s.result.gold > 0 && <Gold n={s.result.gold} />}
              {s.result.items.map((k, i) => <span key={i}>{getItem(k)?.emoji} {getItem(k)?.name ?? k}</span>)}
              {s.result.levelUp && <b className="text-violet-300">⭐ Stufe {s.result.levelUp}!</b>}
            </p>
          )}
          {s.result && s.status === "lost" && s.result.goldLost > 0 && <p className="text-xs text-gray-300">Du verlierst <Gold n={s.result.goldLost} />.</p>}
          <button type="button" disabled={busy} onClick={() => void send({ action: "close" })} className="oq-btn oq-btn-gold w-full min-h-[48px] text-sm font-black">Weiter</button>
        </div>
      )}
      <BattleLog log={s.log} />
    </div>
  );
}
