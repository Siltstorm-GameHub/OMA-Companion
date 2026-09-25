"use client";

// ============================================
// OMA Quest — Gruppenkampf: Vorraum (Zustimmung), rundenweiser Kampf, Ergebnis
// ============================================

import { useEffect, useRef, useState } from "react";
import { playSfx } from "@/lib/dnd/oq-sfx";
import { ClassIcon, FxLayer, useFightSounds, useFxEvents } from "@/components/te-map/play/Fx";
import type { FxEvent } from "@/lib/dnd/oq-fx";
import { Gold } from "@/components/te-map/play/Currency";
import { AP_PER_ROUND, abilitiesOf, getMonster, type Monster } from "@/lib/dnd/combat";
import { alive, TURN_MS, type GroupHero } from "@/lib/dnd/group-combat";
import { getItem } from "@/lib/dnd/items";
import type { GroupFightView } from "@/lib/dnd/group-fight-server";

export interface GroupSnapshot {
  fight: GroupFightView | null;
  group: { inParty: boolean; here: number; size: number; raid: boolean; max: number; leader: boolean; memberIds: string[] };
  raidBosses: Monster[];
}

export type FightCall = (body: Record<string, unknown>) => Promise<void>;

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-2.5 rounded bg-black/50 border border-white/10 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${color} transition-all`} style={{ width: `${Math.max(0, Math.min(100, (value / max) * 100))}%` }} />
    </div>
  );
}

/** Sekunden bis `target` (Server-Zeit), aktualisiert sich selbst. */
function useCountdown(target: number, serverNow: number): number {
  const skew = useRef(0);
  useEffect(() => { skew.current = serverNow - Date.now(); }, [serverNow]);
  const [left, setLeft] = useState(() => Math.max(0, Math.ceil((target - serverNow) / 1000)));
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((target - (Date.now() + skew.current)) / 1000)));
    tick();
    const t = setInterval(tick, 500);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

function Lobby({ view, myId, call, busy }: { view: GroupFightView; myId: string; call: FightCall; busy: boolean }) {
  const m = getMonster(view.monsterId);
  const left = useCountdown(view.lobbyEndsAt, view.serverNow);
  const mine = view.initiatorCardId === myId;
  const pending = view.members.filter((x) => x.status === "invited");
  const joined = view.members.filter((x) => x.status === "joined");
  return (
    <div className="space-y-3">
      <p className="text-sm font-black text-white">{m?.emoji} Gruppenkampf gegen {m?.name}{m?.raid ? " (Raid)" : ""}</p>
      <ul className="space-y-1 text-xs">
        {view.members.map((x) => (
          <li key={x.cardId} className="flex items-center gap-2 text-white">
            <span>{x.status === "joined" ? "✅" : x.status === "declined" ? "❌" : "⏳"}</span>
            <span>{x.name}{x.cardId === view.initiatorCardId ? " (startet den Kampf)" : ""}</span>
            <span className="text-gray-500">{x.status === "joined" ? "dabei" : x.status === "declined" ? "abgelehnt" : "überlegt noch …"}</span>
          </li>
        ))}
      </ul>
      {m?.raid && <p className="text-[11px] text-amber-200">Raid-Boss: mindestens {m.raid.min} Helden nötig ({joined.length} dabei).</p>}
      {pending.length > 0 && <p className="text-[11px] text-gray-400">{left > 0 ? `Noch ${left} s Zeit zum Beitreten …` : "Die Zeit ist um."}</p>}
      {mine ? (
        <div className="flex flex-wrap gap-1.5">
          {pending.length === 0 || left === 0 ? (
            <button type="button" disabled={busy} onClick={() => void call({ action: "begin", fightId: view.id })} className="oq-btn oq-btn-gold text-xs px-3 py-2">
              ⚔️ {pending.length ? `Ohne ${pending.map((p) => p.name).join(", ")} beginnen` : "Kampf beginnen"}
            </button>
          ) : null}
          <button type="button" disabled={busy} onClick={() => void call({ action: "cancel", fightId: view.id })} className="oq-btn text-xs px-3 py-2">Abbrechen</button>
        </div>
      ) : view.myStatus === "invited" ? (
        <div className="flex gap-1.5">
          <button type="button" disabled={busy} onClick={() => void call({ action: "join", fightId: view.id })} className="oq-btn oq-btn-gold text-xs px-3 py-2">Beitreten</button>
          <button type="button" disabled={busy} onClick={() => void call({ action: "decline", fightId: view.id })} className="oq-btn text-xs px-3 py-2">Ablehnen</button>
        </div>
      ) : <p className="text-[11px] text-gray-400">Du bist dabei. Warte, bis der Kampf beginnt …</p>}
    </div>
  );
}

function HeroCard({ h, active, mine, fx }: { h: GroupHero; active: boolean; mine: boolean; fx: FxEvent[] }) {
  return (
    <div className={`oq-slot p-2 space-y-1 relative ${active ? "ring-2 ring-amber-300" : ""} ${!alive(h) ? "opacity-60" : ""}`}>
      <FxLayer events={fx} />
      <p className="text-[11px] font-black text-white truncate flex items-center gap-1"><ClassIcon classId={h.fighter.classId} size={18} />{mine ? "★ " : ""}{h.name}{active ? " ◀" : ""}{h.left ? " (geflohen)" : h.hp <= 0 ? " (am Boden)" : ""}</p>
      <Bar value={h.hp} max={h.fighter.maxHp} color="bg-emerald-500" />
      <p className="text-[10px] text-gray-300">{h.hp}/{h.fighter.maxHp} LP · RK {h.fighter.ac}{h.guard > 0 ? " + Schild" : ""}</p>
    </div>
  );
}

function Fight({ view, myId, call, busy }: { view: GroupFightView; myId: string; call: FightCall; busy: boolean }) {
  const s = view.state!;
  const m = getMonster(s.monsterId);
  const logEnd = useRef<HTMLDivElement>(null);
  useEffect(() => { logEnd.current?.scrollIntoView({ block: "nearest" }); }, [s.log.length]);
  const me = s.heroes.find((h) => h.cardId === myId);
  const fx = useFxEvents(s.log, s.heroes.map((h) => h.name));
  useFightSounds(s.monsterId, s.status);
  const turnHero = s.heroes[s.turn];
  const myTurn = s.status === "active" && turnHero?.cardId === myId && !!me && alive(me);
  const secLeft = useCountdown(s.turnStartedAt + TURN_MS, view.serverNow);
  const { main, second } = me ? abilitiesOf(me.fighter) : { main: null, second: null };
  const [target, setTarget] = useState<string>("");
  const cd = (id: string) => me?.cooldowns[id] ?? 0;
  const act = (a: string) => void call({ action: "act", fightId: view.id, act: a, ...(target ? { target } : {}) });
  const needsTarget = (ab: { kind: string; id: string } | null) => !!ab && (ab.kind === "heal" || (ab.kind === "guard" && ab.id !== "heiliger-schild"));

  return (
    <div className="space-y-3">
      <div className="oq-slot p-3 space-y-1 relative">
        <FxLayer events={fx.filter((e) => e.side === "monster")} />
        <p className="text-xs font-black text-white">{m?.emoji} {m?.name} <span className="text-gray-500 font-normal">RK {m?.ac}{s.taunt > 0 ? " · verspottet" : ""}{s.inspire > 0 ? " · Gruppe inspiriert" : ""}{s.provoke ? " · Angriffe auf den Schildträger" : ""}</span></p>
        <Bar value={s.monsterHp} max={s.monsterMaxHp} color="bg-red-500" />
        <p className="text-[11px] text-gray-300">{s.monsterHp} / {s.monsterMaxHp} LP · Runde {s.round}</p>
      </div>
      <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
        {s.heroes.map((h) => <HeroCard key={h.cardId} h={h} active={s.status === "active" && h.cardId === turnHero?.cardId} mine={h.cardId === myId} fx={fx.filter((e) => e.side === "hero" && (e.hero ? e.hero === h.name : h.cardId === myId))} />)}
      </div>
      <div className="oq-slot p-2 h-40 overflow-y-auto space-y-0.5 text-[11px] text-gray-200" aria-live="polite">
        {s.log.map((l, i) => <p key={i} className={i === s.log.length - 1 ? "text-white font-semibold" : ""}>{l}</p>)}
        <div ref={logEnd} />
      </div>

      {s.status === "active" ? (
        myTurn && me ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-white">
              <span className="font-black">Du bist dran</span>
              <span className="flex gap-1">{Array.from({ length: AP_PER_ROUND }, (_, i) => <span key={i} className={`w-3 h-3 rounded-full border border-amber-300 ${i < me.ap ? "bg-amber-300" : ""}`} />)}</span>
              <span className="text-gray-400">{me.ap} Aktion{me.ap === 1 ? "" : "en"} · {secLeft} s</span>
            </div>
            {(needsTarget(main) || needsTarget(second)) && (
              <label className="block text-[11px] text-gray-400">Ziel für Heilung/Schutz
                <select value={target} onChange={(e) => setTarget(e.target.value)} className="ml-2 rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white">
                  <option value="">Ich selbst</option>
                  {s.heroes.filter((h) => !h.left && h.cardId !== myId).map((h) => <option key={h.cardId} value={h.cardId}>{h.name}{h.hp <= 0 ? " (am Boden — belebt)" : ` (${h.hp}/${h.fighter.maxHp})`}</option>)}
                </select>
              </label>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button type="button" disabled={busy || me.ap < 1} onClick={() => act("attack")} className="oq-btn text-xs px-3 py-2">⚔️ Angriff <span className="text-gray-500">1</span></button>
              {main && <button type="button" disabled={busy || me.ap < main.ap || cd(main.id) > 0} onClick={() => act("ability")} title={main.desc} className="oq-btn oq-btn-gold text-xs px-3 py-2">{main.icon} {main.name} <span className="opacity-70">{main.ap}{cd(main.id) > 0 ? ` · ${cd(main.id)}R` : ""}</span></button>}
              {second && <button type="button" disabled={busy || me.ap < second.ap || cd(second.id) > 0} onClick={() => act("ability2")} title={second.desc} className="oq-btn oq-btn-gold text-xs px-3 py-2">{second.icon} {second.name} <span className="opacity-70">{second.ap}{cd(second.id) > 0 ? ` · ${cd(second.id)}R` : ""}</span></button>}
              <button type="button" disabled={busy || me.ap < 1} onClick={() => act("defend")} className="oq-btn text-xs px-3 py-2">🛡️ Deckung <span className="text-gray-500">1</span></button>
              <button type="button" disabled={busy || me.ap < 1} onClick={() => act("flee")} className="oq-btn text-xs px-3 py-2">🏃 Fliehen <span className="text-gray-500">1</span></button>
              <button type="button" disabled={busy} onClick={() => act("end")} className="oq-btn text-xs px-3 py-2 ml-auto">Zug beenden</button>
            </div>
            <p className="text-[10px] text-gray-500">{main?.desc}{second ? ` · ${second.desc}` : ""}</p>
          </div>
        ) : (
          <p className="text-xs text-gray-300">{me && !alive(me) ? (me.left ? "Du bist geflohen." : "Du liegst am Boden — ein Kleriker kann dich wiederbeleben.") : `${turnHero?.name ?? "…"} ist dran (${secLeft} s).`}</p>
        )
      ) : (
        <div className="space-y-2">
          <p className={`text-sm font-black ${s.status === "won" ? "text-emerald-300" : s.status === "fled" ? "text-amber-200" : "text-red-300"}`}>
            {s.status === "won" ? "🏆 Sieg!" : s.status === "fled" ? "🏃 Rückzug" : "💀 Niederlage"}
          </p>
          {s.status === "won" && s.results && (
            <ul className="text-xs text-gray-200 space-y-0.5">
              {s.results.map((r) => (
                <li key={r.cardId} className="flex flex-wrap gap-x-3 items-center">
                  <b className={r.cardId === myId ? "text-amber-200" : ""}>{r.name}</b> +{r.xp} XP {r.gold > 0 && <Gold n={r.gold} />}
                  {r.items.map((k, i) => <span key={i}>{getItem(k)?.emoji} {getItem(k)?.name ?? k}</span>)}
                  {r.levelUp && <b className="text-violet-300">⭐ Stufe {r.levelUp}!</b>}
                </li>
              ))}
            </ul>
          )}
          {s.status === "lost" && <p className="text-xs text-gray-300">Alle Beteiligten verlieren 10 % ihres Golds.</p>}
          <button type="button" disabled={busy} onClick={() => void call({ action: "close", fightId: view.id })} className="oq-btn oq-btn-gold text-xs px-3 py-1.5">Weiter</button>
        </div>
      )}
    </div>
  );
}

/** Einladung zu einem Gruppenkampf (über der Spielfläche, auch wenn das Menü zu ist). */
export function FightInvite({ view, call, busy }: { view: GroupFightView; call: FightCall; busy: boolean }) {
  const m = getMonster(view.monsterId);
  const left = useCountdown(view.lobbyEndsAt, view.serverNow);
  const who = view.members.find((x) => x.cardId === view.initiatorCardId)?.name ?? "Jemand";
  useEffect(() => { playSfx("ping"); }, []);
  return (
    <div className="absolute inset-x-2 top-2 z-50 mx-auto max-w-md rounded-md border-2 border-violet-300/80 bg-[#0b1220]/95 p-3 shadow-[0_3px_0_rgba(0,0,0,0.6)] space-y-2" role="alertdialog" aria-label="Kampf-Einladung">
      <p className="text-xs font-black text-violet-200">⚔️ {who} will mit euch gegen {m?.emoji} {m?.name} kämpfen!</p>
      <p className="text-[11px] text-gray-300">{left > 0 ? `Du hast noch ${left} s Zeit.` : "Die Zeit ist um — der Anführer kann ohne dich beginnen."}</p>
      <div className="flex gap-1.5">
        <button type="button" disabled={busy} onClick={() => void call({ action: "join", fightId: view.id })} className="oq-btn oq-btn-gold text-xs px-3 py-1.5">Beitreten</button>
        <button type="button" disabled={busy} onClick={() => void call({ action: "decline", fightId: view.id })} className="oq-btn text-xs px-3 py-1.5">Ablehnen</button>
      </div>
    </div>
  );
}

export default function GroupFightPanel({ view, myId, call, busy }: { view: GroupFightView; myId: string; call: FightCall; busy: boolean }) {
  return (
    <div className="oq-panel p-4">
      {view.status === "LOBBY" ? <Lobby view={view} myId={myId} call={call} busy={busy} /> : view.state ? <Fight view={view} myId={myId} call={call} busy={busy} /> : <p className="text-xs text-gray-400">Lädt …</p>}
    </div>
  );
}
