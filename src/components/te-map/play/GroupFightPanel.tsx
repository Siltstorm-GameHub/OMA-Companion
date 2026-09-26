"use client";

// ============================================
// OMA Quest — Gruppenkampf: Vorraum (Zustimmung), rundenweiser Kampf, Ergebnis
// ============================================

import { useEffect, useRef, useState } from "react";
import { playSfx } from "@/lib/dnd/oq-sfx";
import { BattleLog, BattleStage, CommandBar, type Cmd, type StageHero } from "@/components/te-map/play/BattleStage";
import { useFightSounds, useFxEvents } from "@/components/te-map/play/Fx";
import { Gold } from "@/components/te-map/play/Currency";
import { AP_PER_ROUND, abilitiesOf, getMonster, type Monster } from "@/lib/dnd/combat";
import type { BackdropKey } from "@/lib/dnd/oq-backdrop";
import { alive, TURN_MS } from "@/lib/dnd/group-combat";
import { getItem } from "@/lib/dnd/items";
import type { GroupFightView } from "@/lib/dnd/group-fight-server";

export interface GroupSnapshot {
  fight: GroupFightView | null;
  group: { inParty: boolean; here: number; size: number; raid: boolean; max: number; leader: boolean; memberIds: string[] };
  raidBosses: Monster[];
}

export type FightCall = (body: Record<string, unknown>) => Promise<void>;

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

function Fight({ view, myId, call, busy, backdrop }: { view: GroupFightView; myId: string; call: FightCall; busy: boolean; backdrop?: BackdropKey }) {
  const s = view.state!;
  const fx = useFxEvents(s.log, s.heroes.map((h) => h.name), (line) => s.heroes.find((h) => line.startsWith(h.name))?.fighter.classId);
  useFightSounds(s.monsterId, s.status);
  const me = s.heroes.find((h) => h.cardId === myId);
  const turnHero = s.heroes[s.turn];
  const myTurn = s.status === "active" && turnHero?.cardId === myId && !!me && alive(me);
  const secLeft = useCountdown(s.turnStartedAt + TURN_MS, view.serverNow);
  const { main, second } = me ? abilitiesOf(me.fighter) : { main: null, second: null };
  const [target, setTarget] = useState<string>("");
  const cd = (id: string) => me?.cooldowns[id] ?? 0;
  const needsTarget = (ab: { kind: string; id: string } | null) => !!ab && (ab.kind === "heal" || (ab.kind === "guard" && ab.id !== "heiliger-schild"));
  const act = (a: string) => void call({ action: "act", fightId: view.id, act: a, ...(target && target !== myId ? { target } : {}) });
  const targetName = s.heroes.find((h) => h.cardId === (target || myId))?.name;
  const heroes: StageHero[] = s.heroes.map((h) => ({ key: h.cardId, name: h.name, classId: h.fighter.classId, character: h.character ?? null, hp: h.hp, maxHp: h.fighter.maxHp, ac: h.fighter.ac + (h.guard > 0 ? 3 : 0), guard: h.guard > 0, down: h.hp <= 0, left: h.left, active: h.cardId === turnHero?.cardId, mine: h.cardId === myId }));
  const monNote = [s.taunt > 0 ? "verspottet" : "", s.inspire > 0 ? "Gruppe inspiriert" : "", s.provoke ? "zielt auf den Schildträger" : ""].filter(Boolean).join(", ") || undefined;
  const cmds: Cmd[] = me && main ? [
    { key: "attack", label: "Angriff", icon: "⚔️", cost: 1, disabled: me.ap < 1, onClick: () => act("attack") },
    { key: "ability", label: main.name, icon: main.icon, cost: main.ap, cd: cd(main.id), disabled: me.ap < main.ap, gold: true, hint: `${main.name}: ${main.desc}${needsTarget(main) ? " Tippe auf einen Helden, um das Ziel zu wählen." : ""}`, onClick: () => act("ability") },
    ...(second ? [{ key: "ability2", label: second.name, icon: second.icon, cost: second.ap, cd: cd(second.id), disabled: me.ap < second.ap, gold: true, hint: `${second.name}: ${second.desc}${needsTarget(second) ? " Tippe auf einen Helden, um das Ziel zu wählen." : ""}`, onClick: () => act("ability2") }] : []),
    { key: "defend", label: "Deckung", icon: "🛡️", cost: 1, disabled: me.ap < 1, hint: "Deckung: +3 Rüstung bis zur nächsten Runde.", onClick: () => act("defend") },
    { key: "flee", label: "Fliehen", icon: "🏃", cost: 1, disabled: me.ap < 1, hint: "Fliehen: Geschicksprobe; bei Erfolg verlässt du den Kampf.", onClick: () => act("flee") },
  ] : [];
  const info = myTurn && (needsTarget(main) || needsTarget(second)) ? `Ziel: ${targetName ?? "du"}` : `${secLeft} s`;

  return (
    <div className="space-y-2.5">
      <BattleStage
        monsterId={s.monsterId} monsterHp={s.monsterHp} monsterMaxHp={s.monsterMaxHp} monsterNote={monNote}
        backdrop={backdrop} heroes={heroes} fx={fx} status={s.status}
        selectedKey={myTurn ? target || myId : undefined} onPickHero={myTurn ? (k) => setTarget(k) : undefined}
      />
      {s.status === "active" ? (
        myTurn && me ? (
          <CommandBar round={s.round} ap={me.ap} apMax={AP_PER_ROUND} cmds={cmds} onEnd={() => act("end")} busy={busy} info={info} />
        ) : (
          <p className="text-xs text-gray-300 oq-slot p-2.5">{me && !alive(me) ? (me.left ? "Du bist geflohen." : "Du liegst am Boden — ein Kleriker kann dich wiederbeleben.") : `${turnHero?.name ?? "…"} ist dran (${secLeft} s).`}</p>
        )
      ) : (
        <div className="space-y-2">
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
          <button type="button" disabled={busy} onClick={() => void call({ action: "close", fightId: view.id })} className="oq-btn oq-btn-gold w-full min-h-[48px] text-sm font-black">Weiter</button>
        </div>
      )}
      <BattleLog log={s.log} />
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

export default function GroupFightPanel({ view, myId, call, busy, backdrop }: { view: GroupFightView; myId: string; call: FightCall; busy: boolean; backdrop?: BackdropKey }) {
  return (
    <div className="oq-panel p-4">
      {view.status === "LOBBY" ? <Lobby view={view} myId={myId} call={call} busy={busy} /> : view.state ? <Fight view={view} myId={myId} call={call} busy={busy} backdrop={backdrop} /> : <p className="text-xs text-gray-400">Lädt …</p>}
    </div>
  );
}
