"use client";

// ============================================
// OMA Quest — Spiel-Panels: Chat (mit Moderation), Ereignisse, Händler, Charakter, Inventar, Gruppe, Spielleiter, HUD
// ============================================

import { useEffect, useRef, useState } from "react";
import { EMOTE_ICONS, type ChatMessage } from "@/components/te-map/TeWorld";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { D20 } from "@/components/te-map/play/Dice";
import type { CharacterSheet } from "@/lib/dnd/rpg-server";
import type { PartyView, InviteView } from "@/lib/dnd/party";
import type { WorldEventView } from "@/lib/dnd/world-events";
import CompanionPanel from "@/components/te-map/play/CompanionPanel";
import { getItem, ITEMS as ITEM_OPTIONS, SLOT_LABEL, sellPrice, type ItemSlot } from "@/lib/dnd/items";
import { ABILITY_LABEL, ABILITY_SHORT, MAX_LEVEL } from "@/lib/te-map/rpg";
import { buyPriceFor, effectsOf, getPerk, PERKS, sellPriceFor } from "@/lib/dnd/perks";
import { Coins, Gold } from "@/components/te-map/play/Currency";
import { ClassIcon } from "@/components/te-map/play/Fx";
import type { LeaderboardEntry, ProgressView } from "@/lib/dnd/progression";

const panel = "oq-panel p-4 space-y-2";
const label = "oq-title";
const btn = "oq-btn text-xs px-3 py-1.5";

async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json as T } : { ok: false, error: json.error ?? "Fehlgeschlagen." };
  } catch {
    return { ok: false, error: "Netzwerkfehler." };
  }
}

/** Charakterbogen laden; `refreshKey` ändern lädt neu. */
export function useSheet(refreshKey = 0): CharacterSheet | null {
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/character/sheet").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setSheet(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);
  return sheet;
}

// ── Kopfzeile im Spiel (Stufe, Titel, XP, Gold, Münzen, offene Belohnung) ──

export function HudBar({ refreshKey = 0, onOpen, notify }: { refreshKey?: number; onOpen?: () => void; notify?: Notify }) {
  const sheet = useSheet(refreshKey);
  const lastLevel = useRef<number | null>(null);
  useEffect(() => {
    if (!sheet) return;
    // Stufenaufstieg melden (nicht beim ersten Laden)
    if (lastLevel.current !== null && sheet.level > lastLevel.current) notify?.("level", `Stufe ${sheet.level} erreicht!`, "Öffne den Charakterbogen (C) und wähle deine Belohnung.");
    lastLevel.current = sheet.level;
  }, [sheet, notify]);
  if (!sheet) return null;
  const open = sheet.attrPoints + sheet.perkPicks;
  return (
    <div className="oq-panel flex items-center gap-3 px-3 py-1.5 text-xs text-white">
      <span className="font-black text-violet-200">Stufe {sheet.level}</span>
      <span className="hidden sm:inline text-[10px] text-gray-400">{sheet.title}</span>
      <span className="w-24 h-2 rounded-full bg-black/60 border border-white/15 overflow-hidden" title={`${sheet.xp} XP`}><span className="block h-full bg-violet-400" style={{ width: `${Math.round(sheet.progress * 100)}%` }} /></span>
      <Gold n={sheet.gold} className="font-bold text-amber-300" />
      {sheet.coins !== undefined && <Coins n={sheet.coins} className="font-bold text-yellow-200" />}
      {open > 0 && onOpen && (
        <button type="button" onClick={onOpen} className="pointer-events-auto oq-btn oq-btn-gold text-[10px] px-2 py-0.5 animate-pulse" title="Belohnung wählen">⭐ Aufstieg! ({open})</button>
      )}
    </div>
  );
}

// ── Chat + Emotes + Moderation ──────────────────────────────

export function SocialPanel({ slug, chat, onEmote, isMod, myCardId, onRemoved, notify }: {
  slug: string; chat: ChatMessage[]; onEmote: (id: string) => void; isMod: boolean; myCardId: string | null; onRemoved: (id: string) => void; notify?: Notify;
}) {
  const { notify: say, node } = useNotice(notify);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [reported, setReported] = useState<Set<string>>(new Set());

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const r = await post(`/api/dnd/world/${slug}/chat`, { text: t });
    setBusy(false);
    if (!r.ok) { say("error", r.error); return; }
    setText("");
  };
  const moderate = async (id: string, body: Record<string, unknown>, okText: string) => {
    const r = await post(`/api/dnd/chat/${id}`, body);
    if (!r.ok) { say("error", r.error); return; }
    if (body.action === "report") setReported((s) => new Set(s).add(id));
    else onRemoved(id);
    say("info", okText);
  };

  return (
    <div className={panel}>
      <p className={label}>Chat in dieser Location</p>
      {node}
      <div className="max-h-44 overflow-y-auto space-y-0.5 text-xs" aria-live="polite">
        {chat.length === 0 ? <p className="text-gray-500">Noch ruhig hier. Sag etwas — wer gerade da ist, sieht deine Sprechblase.</p> : chat.slice(-40).map((m) => (
          <p key={m.id} className="group text-gray-300 flex flex-wrap items-baseline gap-x-1.5">
            <span><span className="font-bold text-amber-200">{m.name}:</span> {m.text}</span>
            {isMod && (m.reports ?? 0) > 0 && <span className="text-[10px] font-bold text-red-300" title="Meldungen">⚑ {m.reports}</span>}
            <span className="ml-auto flex gap-1 opacity-60 group-hover:opacity-100">
              {m.cardId !== myCardId && !reported.has(m.id) && !isMod && <button type="button" onClick={() => void moderate(m.id, { action: "report" }, "Danke, die Nachricht wurde gemeldet.")} className="text-[10px] text-gray-400 hover:text-red-300" title="Melden">⚑ Melden</button>}
              {reported.has(m.id) && <span className="text-[10px] text-gray-500">gemeldet</span>}
              {isMod && (
                <>
                  <button type="button" onClick={() => void moderate(m.id, { action: "delete" }, "Nachricht ausgeblendet.")} className="text-[10px] text-gray-400 hover:text-red-300" title="Für alle ausblenden">🗑</button>
                  <button type="button" onClick={() => void moderate(m.id, { action: "mute", minutes: 60 }, `${m.name} 1 Stunde stummgeschaltet.`)} className="text-[10px] text-gray-400 hover:text-red-300" title="1 Stunde stummschalten">🔇 1h</button>
                  <button type="button" onClick={() => void moderate(m.id, { action: "mute", minutes: 1440 }, `${m.name} 24 Stunden stummgeschaltet.`)} className="text-[10px] text-gray-400 hover:text-red-300" title="24 Stunden stummschalten">24h</button>
                </>
              )}
            </span>
          </p>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
        <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Nachricht … (keine Links)" className="flex-1 rounded bg-zinc-900 border-2 border-[#4a3b1c] px-2 py-1.5 text-xs text-white" />
        <button type="submit" disabled={busy || !text.trim()} className={btn}>Senden</button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(EMOTE_ICONS).map(([id, icon]) => (
          <button key={id} type="button" onClick={() => onEmote(id)} aria-label={`Emote ${id}`} className="oq-btn px-2 py-1 text-base">{icon}</button>
        ))}
      </div>
    </div>
  );
}

// ── Spielleiter-Ereignisse (in der Spielfläche) ─────────────

interface EventResult { roll?: { roll: number; modifier: number; total: number; dc: number; success: boolean; crit?: boolean; fumble?: boolean }; success: boolean; text: string; gold?: number; itemName?: string; results?: { name: string; total: number; success: boolean }[] }

export function EventCards({ events, onDismiss, onChanged, notify }: { events: WorldEventView[]; onDismiss: (id: string) => void; onChanged: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [res, setRes] = useState<Record<string, EventResult>>({});
  const [rolling, setRolling] = useState<string | null>(null);
  const respond = async (id: string, isCheck: boolean) => {
    setRolling(id);
    const started = Date.now();
    const r = await post<EventResult>(`/api/dnd/events/${id}`, {});
    // Der Würfel darf mindestens kurz rollen, auch wenn der Server schnell war
    if (isCheck) await new Promise((ok) => setTimeout(ok, Math.max(0, 1300 - (Date.now() - started))));
    setRolling(null);
    if (!r.ok) { say("error", r.error); return; }
    setRes((m) => ({ ...m, [id]: r.data }));
    onChanged();
  };
  if (!events.length && !node) return null;
  return (
    <div className="space-y-2">
      {node}
      {events.map((e) => {
        const r = res[e.id];
        return (
          <div key={e.id} className="oq-panel !border-amber-300/70 p-3 space-y-1.5 bg-[#1a1608]">
            <div className="flex items-start gap-2">
              <p className="text-sm font-black text-amber-200">{e.kind === "announce" ? "📣" : e.kind === "check" ? "🎲" : "🎁"} {e.title}</p>
              <span className="text-[10px] text-gray-400">{e.authorName}{e.everywhere ? " · überall" : ""}</span>
              <button type="button" onClick={() => onDismiss(e.id)} aria-label="Ausblenden" className="ml-auto text-gray-400 hover:text-white">✕</button>
            </div>
            {e.text && <p className="text-xs text-gray-200">{e.text}</p>}
            {rolling === e.id && <div className="grid place-items-center scale-50 -my-8"><D20 value={null} state="shake" /></div>}
            {e.kind === "check" && e.check && !r && rolling !== e.id && (
              <button type="button" onClick={() => void respond(e.id, true)} className="oq-btn oq-btn-primary text-xs px-3 py-1.5">🎲 Würfeln ({ABILITY_LABEL[e.check.ability]}, SG {e.check.dc})</button>
            )}
            {e.kind === "loot" && e.loot && !r && (
              <button type="button" onClick={() => void respond(e.id, false)} className="oq-btn oq-btn-gold text-xs px-3 py-1.5">
                Zugreifen ({e.loot.gold ? `${e.loot.gold} Gold` : ""}{e.loot.gold && e.loot.item ? " + " : ""}{e.loot.item ? getItem(e.loot.item)?.name ?? e.loot.item : ""}) — nur {e.loot.max}
              </button>
            )}
            {r && (
              <div className={`rounded-md px-3 py-2 text-xs font-bold ${r.success ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
                {r.roll ? `🎲 ${r.roll.roll}${r.roll.modifier ? ` ${r.roll.modifier > 0 ? "+" : "−"} ${Math.abs(r.roll.modifier)}` : ""} = ${r.roll.total} gegen SG ${r.roll.dc} — ` : ""}{r.text}
                {r.gold ? ` +${r.gold} Gold` : ""}{r.itemName ? ` · ${getItem(r.itemName)?.name ?? r.itemName}` : ""}
                {r.results && r.results.length > 1 && <span className="block font-normal text-gray-300 mt-1">Alle: {r.results.map((x) => `${x.name} ${x.total ? x.total : ""}${x.success ? " ✓" : " ✗"}`).join(" · ")}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Händler (Fenster in der Spielfläche) ────────────────────

export function ShopPanel({ slug, actorId, merchantName, shop, onClose, onSheetChanged, notify }: { slug: string; actorId: string; merchantName: string; shop: string[]; onClose: () => void; onSheetChanged: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [reload, setReload] = useState(0);
  const sheet = useSheet(reload);
  const trade = async (item: string, action: "buy" | "sell") => {
    const r = await post(`/api/dnd/world/${slug}/shop`, { actor: actorId, item, action });
    if (!r.ok) { say("error", r.error); return; }
    const it = getItem(item);
    say("reward", action === "buy" ? `${it?.name ?? item} gekauft` : `${it?.name ?? item} verkauft`);
    setReload((n) => n + 1);
    onSheetChanged();
  };
  return (
    <div className="absolute inset-0 z-40 grid place-items-center bg-black/70 p-2" role="dialog" aria-label={`Händler ${merchantName}`}>
      <div className="oq-panel w-full max-w-lg max-h-full overflow-y-auto p-4 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-black text-amber-200">🛒 {merchantName}</p>
          <Gold n={sheet?.gold ?? "…"} className="ml-auto text-xs text-amber-300 font-bold" />
          <button type="button" onClick={onClose} className={btn}>Schließen</button>
        </div>
        {node}
        <p className={label}>Angebot</p>
        <ul className="space-y-1.5">
          {shop.map((k) => { const it = getItem(k); return it ? (
            <li key={k} className="flex items-center gap-2 text-xs text-white">
              <span className="oq-slot w-9 h-9 grid place-items-center text-xl">{it.emoji}</span>
              <span className="min-w-0"><b>{it.name}</b> <span className="text-gray-500">({SLOT_LABEL[it.slot]}{it.bonus ? `, +${it.bonus.value} ${ABILITY_SHORT[it.bonus.ability]}` : ""})</span><br /><span className="text-gray-400">{it.desc}</span></span>
              <button type="button" disabled={!sheet || sheet.gold < buyPriceFor(it.price, effectsOf(sheet?.perks ?? []).trader)} onClick={() => void trade(k, "buy")} className={`${btn} oq-btn-gold ml-auto shrink-0`}><Gold n={buyPriceFor(it.price, effectsOf(sheet?.perks ?? []).trader)} /></button>
            </li>) : null; })}
          {shop.length === 0 && <li className="text-xs text-gray-500">Der Händler hat gerade nichts im Angebot.</li>}
        </ul>
        <p className={label}>Dein Rucksack</p>
        {sheet && sheet.inventory.length === 0 && <p className="text-xs text-gray-500">Leer.</p>}
        <ul className="space-y-1.5">
          {sheet?.inventory.map((e) => (
            <li key={e.key} className="flex items-center gap-2 text-xs text-white">
              <span className="oq-slot w-9 h-9 grid place-items-center text-xl">{e.item.emoji}</span><span>{e.item.name}{e.qty > 1 ? ` ×${e.qty}` : ""}{e.equipped ? " (angelegt)" : ""}</span>
              <button type="button" onClick={() => void trade(e.key, "sell")} className={`${btn} ml-auto`}>Verkaufen · <Gold n={sellPriceFor(sellPrice(e.item), effectsOf(sheet?.perks ?? []).trader)} /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Charakter (Stufe, Titel, Währungen, Attribute mit Punkteverteilung, Fähigkeiten) ──

export function CharacterPanel({ refreshKey = 0, onChanged, notify }: { refreshKey?: number; onChanged?: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [reload, setReload] = useState(0);
  const sheet = useSheet(refreshKey + reload);
  const [busy, setBusy] = useState(false);
  if (!sheet) return null;

  const spend = async (body: Record<string, unknown>, ok: string) => {
    setBusy(true);
    const r = await post<CharacterSheet>("/api/dnd/character/level", body);
    setBusy(false);
    if (!r.ok) { say("error", r.error); return; }
    say("level", ok);
    setReload((n) => n + 1);
    onChanged?.();
  };
  const owned = sheet.perks.map(getPerk).filter((p): p is NonNullable<ReturnType<typeof getPerk>> => !!p);
  const choices = PERKS.filter((p) => !sheet.perks.includes(p.id));

  return (
    <div className={panel}>
      {node}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-base font-black text-white">{sheet.name}</p>
        <span className="text-sm font-black text-violet-200">Stufe {sheet.level} · {sheet.title}</span>
        <span className="flex items-center gap-1.5 text-xs font-bold text-amber-200"><ClassIcon classId={sheet.identity.classId} size={20} />{sheet.identity.race ? `${sheet.identity.race} · ` : ""}{sheet.identity.className}</span>
        <Gold n={sheet.gold} className="text-xs text-amber-300 font-bold" />
        {sheet.coins !== undefined && <Coins n={sheet.coins} className="text-xs text-yellow-200 font-bold" />}
      </div>
      <div>
        <div className="h-2.5 rounded-full bg-black/60 border border-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.round(sheet.progress * 100)}%` }} /></div>
        <p className="text-[10px] text-gray-500 mt-0.5">{sheet.xp} XP{sheet.level < MAX_LEVEL ? ` — nächste Stufe bei ${sheet.xpForNextLevel}` : " — Höchststufe"}</p>
      </div>

      <div className="grid gap-1.5 sm:grid-cols-2">
        {[sheet.identity.raceTrait && { label: `Volksmerkmal${sheet.identity.race ? ` · ${sheet.identity.race}` : ""}`, t: sheet.identity.raceTrait }, sheet.identity.classTrait && { label: `Klassenmerkmal · ${sheet.identity.className}`, t: sheet.identity.classTrait }].filter((x): x is { label: string; t: { name: string; icon: string; desc: string } } => !!x).map((x) => (
          <div key={x.label} className="oq-slot p-2">
            <p className="text-[9px] font-black uppercase tracking-widest text-violet-300">{x.label}</p>
            <p className="text-xs font-black text-white">{x.t.icon} {x.t.name}</p>
            <p className="text-[11px] text-gray-300 leading-snug">{x.t.desc}</p>
          </div>
        ))}
      </div>

      {(sheet.attrPoints > 0 || sheet.perkPicks > 0) && (
        <div className="rounded-md border-2 border-amber-300/60 bg-amber-300/10 px-3 py-2 text-xs text-amber-100">
          <p className="font-black">⭐ Stufenaufstieg — deine Belohnung wartet</p>
          <p>{sheet.attrPoints > 0 ? `${sheet.attrPoints} Attributspunkt${sheet.attrPoints === 1 ? "" : "e"} zum Verteilen (+ bei einem Attribut)` : ""}{sheet.attrPoints > 0 && sheet.perkPicks > 0 ? " · " : ""}{sheet.perkPicks > 0 ? `${sheet.perkPicks} Fähigkeit${sheet.perkPicks === 1 ? "" : "en"} zum Wählen` : ""}</p>
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {sheet.abilities.map((a) => {
          const total = a.score + a.bonus;
          return (
            <div key={a.key} className="oq-slot px-2 py-1.5 text-center" title={ABILITY_LABEL[a.key]}>
              <p className="text-[10px] text-gray-400 font-bold leading-tight break-words">{ABILITY_LABEL[a.key]}</p>
              <p className="text-base font-black text-white">{total}{a.bonus > 0 && <span className="text-[9px] text-emerald-300 font-bold"> (+{a.bonus})</span>}</p>
              <p className="text-[10px] text-sky-300">{a.mod + a.equipment >= 0 ? "+" : "−"}{Math.abs(a.mod + a.equipment)}{a.equipment ? " ⚙" : ""}</p>
              {sheet.attrPoints > 0 && total < 20 && (
                <button type="button" disabled={busy} onClick={() => void spend({ action: "attr", ability: a.key }, `${ABILITY_LABEL[a.key]} +1`)} className="oq-btn oq-btn-gold mt-1 w-full text-xs py-0.5" aria-label={`${ABILITY_LABEL[a.key]} erhöhen`}>+</button>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-500">Proben: d20 + Modifikator (+ 1 je 3 Stufen) gegen den Schwierigkeitsgrad. ⚙ = Bonus durch Ausrüstung und Fähigkeiten. Maximal 20 pro Attribut.</p>

      {owned.length > 0 && (
        <div className="space-y-1">
          <p className={label}>Fähigkeiten</p>
          <ul className="grid gap-1 sm:grid-cols-2">
            {owned.map((p) => <li key={p.id} className="oq-slot px-2.5 py-1.5 text-xs text-white"><span className="mr-1">{p.icon}</span><b>{p.name}</b><br /><span className="text-gray-400">{p.desc}</span></li>)}
          </ul>
        </div>
      )}
      {sheet.perkPicks > 0 && (
        <div className="space-y-1">
          <p className={label}>Fähigkeit wählen</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {choices.map((p) => (
              <li key={p.id}>
                <button type="button" disabled={busy} onClick={() => void spend({ action: "perk", perk: p.id }, `${p.name} gelernt`)} className="oq-btn w-full text-left px-2.5 py-1.5 text-xs">
                  <span className="mr-1">{p.icon}</span><b>{p.name}</b><br /><span className="font-normal text-gray-300">{p.desc}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <CompanionPanel onChanged={onChanged} />
    </div>
  );
}

// ── Fortschritt (nächste Belohnung, Meilensteine, Statistik, Bestenliste) ──

export function ProgressPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [data, setData] = useState<{ progress: ProgressView; leaderboard: LeaderboardEntry[] } | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/progress").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setData(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);
  if (!data) return null;
  const { progress: p, leaderboard: board } = data;
  return (
    <div className={panel}>
      <div className="flex flex-wrap items-baseline gap-x-3">
        <p className={label}>Fortschritt</p>
        <span className="text-sm font-black text-white">Stufe {p.level} · {p.title}</span>
        {p.rank && <span className="text-[11px] text-gray-400">Rang {p.rank.position} von {p.rank.of}</span>}
      </div>

      {p.next ? (
        <div className="oq-slot p-3 space-y-0.5">
          <p className="text-xs font-black text-white">Nächste Stufe: {p.next.level}{p.next.title ? ` — Titel „${p.next.title}“` : ""}</p>
          <p className="text-[11px] text-gray-300">Noch <b>{p.next.xpMissing} XP</b> · Belohnung: {p.next.attrPoints} Attributspunkt{p.next.perkPick ? " + eine Fähigkeit zum Wählen" : ""}</p>
        </div>
      ) : <p className="text-xs text-emerald-300 font-bold">Höchststufe erreicht — du bist ein Mythos.</p>}

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="oq-slot py-1.5"><p className="text-base font-black text-white">{p.stats.questsCompleted}</p><p className="text-[9px] text-gray-500 uppercase">Quests erledigt</p></div>
        <div className="oq-slot py-1.5"><p className="text-base font-black text-white">{p.stats.questsActive}</p><p className="text-[9px] text-gray-500 uppercase">Quests laufend</p></div>
        <div className="oq-slot py-1.5"><p className="text-base font-black text-white">{p.stats.perksChosen}</p><p className="text-[9px] text-gray-500 uppercase">Fähigkeiten</p></div>
      </div>

      <p className={label}>Meilensteine</p>
      <ol className="grid gap-1 sm:grid-cols-2">
        {p.milestones.map((m) => (
          <li key={m.level} className={`oq-slot px-2.5 py-1 text-[11px] flex items-center gap-2 ${m.reached ? "text-white" : "text-gray-500"}`}>
            <span className={`w-6 shrink-0 text-center font-black ${m.reached ? "text-emerald-300" : ""}`}>{m.reached ? "✓" : m.level}</span>
            <span className="min-w-0">
              <b>Stufe {m.level}</b>{m.title ? ` · ${m.title}` : ""}<br />
              <span className="text-gray-400">+{m.attrPoints} Attributspunkt{m.perkPick ? " · Fähigkeit" : ""}{m.pack ? ` · ${m.pack === "PREMIUM" ? "Premium-Pack" : "Karten-Pack"}` : ""}</span>
            </span>
          </li>
        ))}
      </ol>

      {board.length > 0 && (
        <>
          <p className={label}>Bestenliste</p>
          <ol className="space-y-1">
            {board.map((e) => (
              <li key={e.cardId} className={`oq-slot flex items-center gap-2 px-2.5 py-1 text-xs ${e.mine ? "oq-slot-on" : ""}`}>
                <span className="w-5 text-center font-black text-gray-400">{e.position}</span>
                {e.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={e.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : <span className="w-6 h-6 rounded-full bg-zinc-800 grid place-items-center text-[10px] font-bold text-white">{e.name.charAt(0).toUpperCase()}</span>}
                <span className="font-bold text-white truncate">{e.name}</span>
                <span className="ml-auto text-violet-200 font-black">Lv {e.level}</span>
                <span className="hidden sm:inline text-[10px] text-gray-400 w-20 text-right">{e.title}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}

// ── Inventar (Ausrüstungsplätze + Rucksack-Raster) ──────────

const SLOTS: ItemSlot[] = ["weapon", "armor", "trinket"];
const GRID = 20;

export function InventoryPanel({ refreshKey = 0, onChanged, notify }: { refreshKey?: number; onChanged?: () => void; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [reload, setReload] = useState(0);
  const sheet = useSheet(refreshKey + reload);
  const [pick, setPick] = useState<string | null>(null);
  if (!sheet) return null;

  const equip = async (key: string, equipped: boolean) => {
    const r = await post<CharacterSheet>("/api/dnd/character/equip", { item: key, equipped });
    if (!r.ok) { say("error", r.error); return; }
    say("info", equipped ? "Angelegt" : "Abgelegt");
    setReload((n) => n + 1);
    onChanged?.();
  };
  const equipped = new Map(sheet.inventory.filter((e) => e.equipped).map((e) => [e.item.slot, e]));
  const selected = sheet.inventory.find((e) => e.key === pick) ?? null;
  const slots: (typeof sheet.inventory[number] | null)[] = [...sheet.inventory, ...Array(Math.max(0, GRID - sheet.inventory.length)).fill(null)];

  return (
    <div className={panel}>
      <div className="flex items-center gap-3">
        <p className={label}>Inventar</p>
        <Gold n={sheet.gold} className="ml-auto text-xs font-bold text-amber-300" />
        {sheet.coins !== undefined && <Coins n={sheet.coins} className="text-xs font-bold text-yellow-200" />}
      </div>
      {node}
      <div className="grid gap-3 sm:grid-cols-[150px_minmax(0,1fr)]">
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">Ausrüstung</p>
          {SLOTS.map((s) => {
            const e = equipped.get(s);
            return (
              <button key={s} type="button" disabled={!e} onClick={() => e && setPick(e.key)} className={`oq-slot w-full flex items-center gap-2 px-2 py-1.5 text-left ${e ? "oq-slot-on" : ""}`}>
                <span className="text-xl w-7 text-center">{e ? e.item.emoji : "▫️"}</span>
                <span className="min-w-0"><span className="block text-[9px] text-gray-500 uppercase">{SLOT_LABEL[s]}</span><span className="block text-[11px] text-white truncate">{e ? e.item.name : "leer"}</span></span>
              </button>
            );
          })}
        </div>
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Rucksack ({sheet.inventory.length}/{GRID})</p>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
            {slots.map((e, i) => (
              <button key={e?.key ?? `empty-${i}`} type="button" disabled={!e} onClick={() => e && setPick(e.key)} title={e ? `${e.item.name}${e.qty > 1 ? ` ×${e.qty}` : ""}` : undefined}
                className={`oq-slot relative aspect-square grid place-items-center text-2xl ${e && pick === e.key ? "oq-slot-on" : ""} ${e?.equipped ? "ring-1 ring-amber-300/60" : ""}`}>
                {e?.item.emoji}
                {e && e.qty > 1 && <span className="absolute bottom-0 right-0.5 text-[9px] font-black text-white [text-shadow:0_1px_2px_#000]">{e.qty}</span>}
                {e?.equipped && <span className="absolute top-0 left-0.5 text-[8px] text-amber-300">●</span>}
              </button>
            ))}
          </div>
        </div>
      </div>
      {selected ? (
        <div className="oq-slot p-2.5 flex flex-wrap items-center gap-3">
          <span className="text-3xl">{selected.item.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-white">{selected.item.name}{selected.qty > 1 ? ` ×${selected.qty}` : ""}</p>
            <p className="text-[11px] text-gray-400">{SLOT_LABEL[selected.item.slot]}{selected.item.bonus ? ` · +${selected.item.bonus.value} ${ABILITY_LABEL[selected.item.bonus.ability]} auf Proben` : ""} · Wert <Gold n={selected.item.price} size={12} /></p>
            <p className="text-[11px] text-gray-300">{selected.item.desc}</p>
          </div>
          {selected.item.slot !== "loot" && <button type="button" onClick={() => void equip(selected.key, !selected.equipped)} className={`${btn} oq-btn-primary`}>{selected.equipped ? "Ablegen" : "Anlegen"}</button>}
        </div>
      ) : <p className="text-[11px] text-gray-500">Tippe einen Gegenstand an, um Details zu sehen und ihn anzulegen. Händler kaufen Fundstücke ab.</p>}
    </div>
  );
}

// ── Gruppe ──────────────────────────────────────────────────

export function PartyPanel({ present, myCardId, notify }: { present: { id: string; name: string }[]; myCardId: string | null; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [party, setParty] = useState<PartyView | null>(null);
  const [invites, setInvites] = useState<InviteView[]>([]);
  const [board, setBoard] = useState<{ position: number; name: string; wins: number; size: number; mine: boolean }[]>([]);
  const [reload, setReload] = useState(0);
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<{ id: string; cardId: string; name: string; text: string }[]>([]);
  const [draft, setDraft] = useState("");
  const chatEnd = useRef<HTMLDivElement>(null);
  const inParty = !!party;

  useEffect(() => {
    let cancelled = false;
    const load = () => fetch("/api/dnd/party").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) { setParty(j.party); setInvites(j.invites); setBoard(j.leaderboard ?? []); } }).catch(() => {});
    void load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [reload]);

  // Gruppen-Chat (nur solange man in einer Gruppe ist)
  useEffect(() => {
    if (!inParty) return;
    let cancelled = false;
    const load = () => fetch("/api/dnd/party/chat").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setMsgs(j.messages); }).catch(() => {});
    void load();
    const t = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(t); };
  }, [inParty, reload]);
  useEffect(() => { chatEnd.current?.scrollIntoView({ block: "nearest" }); }, [msgs.length]);

  const act = async (body: Record<string, unknown>, ok?: string) => {
    const r = await post("/api/dnd/party", body);
    if (!r.ok) { say("error", r.error); return; }
    if (ok) say("info", ok);
    setReload((n) => n + 1);
  };
  const sendChat = async () => {
    const text = draft.trim();
    if (!text) return;
    const r = await post("/api/dnd/party/chat", { text });
    if (!r.ok) { say("error", r.error); return; }
    setDraft("");
    setReload((n) => n + 1);
  };
  const memberIds = new Set(party?.members.map((m) => m.cardId));
  const candidates = present.filter((p) => p.id !== myCardId && !memberIds.has(p.id));
  const isLeader = !!party && party.leaderCardId === myCardId;

  return (
    <div className={panel}>
      <p className={label}>Gruppe{party?.name ? ` · ${party.name}` : ""}{party?.raid ? " · Raid-Modus" : ""}</p>
      {node}
      {invites.map((i) => (
        <div key={i.id} className="flex items-center gap-2 text-xs text-white rounded-md border-2 border-violet-400/50 bg-violet-500/10 px-3 py-2">
          <span><b>{i.fromName}</b> lädt dich in eine Gruppe ein.</span>
          <button type="button" onClick={() => void act({ action: "accept", inviteId: i.id }, "Gruppe beigetreten")} className={`${btn} ml-auto oq-btn-primary`}>Annehmen</button>
          <button type="button" onClick={() => void act({ action: "decline", inviteId: i.id })} className={btn}>Ablehnen</button>
        </div>
      ))}
      {party ? (
        <>
          <ul className="space-y-1 text-xs">
            {party.members.map((m) => (
              <li key={m.cardId} className={`flex items-center gap-2 rounded-md border px-2.5 py-1 ${m.here ? "border-emerald-400/40 text-emerald-200" : "border-white/10 text-gray-400"}`}>
                <span>{m.cardId === party.leaderCardId ? "👑 " : ""}{m.name}{m.cardId === myCardId ? " (du)" : ""}{m.here ? "" : " (woanders)"}</span>
                {isLeader && m.cardId !== myCardId && (
                  <span className="ml-auto flex gap-1">
                    <button type="button" onClick={() => void act({ action: "lead", cardId: m.cardId }, `${m.name} führt jetzt die Gruppe`)} className={`${btn} !px-2 !py-0.5`} title="Führung abgeben" aria-label={`Führung an ${m.name} abgeben`}>👑</button>
                    <button type="button" onClick={() => { if (window.confirm(`${m.name} aus der Gruppe entfernen?`)) void act({ action: "kick", cardId: m.cardId }, `${m.name} entfernt`); }} className={`${btn} !px-2 !py-0.5`} title="Aus der Gruppe entfernen" aria-label={`${m.name} entfernen`}>✕</button>
                  </span>
                )}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-500">{party.members.length} von {party.max} Mitgliedern · {party.wins} gewonnene Gruppenkämpfe. Gruppenmitglieder am selben Ort bekommen die Hälfte der XP einer Location-Quest und kämpfen gemeinsam (Tab Kampf).</p>
          {isLeader && (
            <div className="space-y-1.5 rounded-md border border-white/10 p-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-violet-300">Anführer</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <input value={nameDraft ?? party.name ?? ""} onChange={(e) => setNameDraft(e.target.value)} maxLength={24} placeholder="Gruppenname" className="rounded bg-zinc-900 border border-white/10 px-2 py-1 text-xs text-white" aria-label="Gruppenname" />
                <button type="button" onClick={() => { void act({ action: "rename", name: nameDraft ?? party.name ?? "" }, "Name gespeichert"); setNameDraft(null); }} className={btn}>Speichern</button>
                <button type="button" onClick={() => void act({ action: "raid", on: !party.raid }, party.raid ? "Raid-Modus aus" : "Raid-Modus an: bis zu 8 Mitglieder")} className={`${btn} ${party.raid ? "oq-btn-gold" : ""}`}>{party.raid ? "Raid-Modus: an (8)" : "Raid-Modus aktivieren (bis 8)"}</button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-1.5">
            {!isLeader && <button type="button" onClick={() => void act({ action: "follow" }, "Du folgst dem Anführer")} className={btn}>🧭 Dem Anführer folgen</button>}
            <button type="button" onClick={() => { if (window.confirm("Gruppe wirklich verlassen?")) void act({ action: "leave" }); }} className={btn}>Gruppe verlassen</button>
          </div>

          <p className={label}>Gruppen-Chat</p>
          <div className="oq-slot p-2 h-28 overflow-y-auto space-y-0.5 text-[11px] text-gray-200">
            {msgs.length === 0 && <p className="text-gray-500">Noch nichts geschrieben.</p>}
            {msgs.map((m) => <p key={m.id}><b className={m.cardId === myCardId ? "text-amber-200" : "text-violet-200"}>{m.name}:</b> {m.text}</p>)}
            <div ref={chatEnd} />
          </div>
          <form className="flex gap-1.5" onSubmit={(e) => { e.preventDefault(); void sendChat(); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder="Nachricht an die Gruppe …" className="flex-1 rounded bg-zinc-900 border border-white/10 px-2 py-1 text-xs text-white" aria-label="Nachricht an die Gruppe" />
            <button type="submit" className={btn}>Senden</button>
          </form>
        </>
      ) : <p className="text-xs text-gray-500">Du bist in keiner Gruppe. Lade Spieler ein, die mit dir am selben Ort sind (bis zu 4 Mitglieder, mit Raid-Modus bis 8).</p>}
      {(!party || party.members.length < party.max) && candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {candidates.map((c) => <button key={c.id} type="button" onClick={() => void act({ action: "invite", cardId: c.id }, `${c.name} eingeladen`)} className={btn}>+ {c.name}</button>)}
        </div>
      )}
      {board.length > 0 && (
        <div className="space-y-1 pt-2 border-t border-white/10">
          <p className={label}>Gruppen-Rangliste</p>
          <ol className="text-[11px] text-gray-200 space-y-0.5">
            {board.map((b) => <li key={b.position} className={b.mine ? "text-amber-200 font-bold" : ""}>{b.position}. {b.name} — {b.wins} Sieg{b.wins === 1 ? "" : "e"} ({b.size} Mitglieder)</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}

// ── Spielleiter ─────────────────────────────────────────────

export function GmPanel({ slug, notify }: { slug: string; notify?: Notify }) {
  const { notify: say, node } = useNotice(notify);
  const [kind, setKind] = useState<"announce" | "check" | "loot">("announce");
  const [scope, setScope] = useState<"here" | "all">("here");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [ability, setAbility] = useState("str");
  const [dc, setDc] = useState(12);
  const [gold, setGold] = useState(20);
  const [item, setItem] = useState("");
  const [max, setMax] = useState(3);
  const [busy, setBusy] = useState(false);
  const field = "mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1 text-white text-xs";

  const send = async () => {
    setBusy(true);
    const params = kind === "check" ? { ability, dc } : kind === "loot" ? { gold, item: item || null, max } : undefined;
    const r = await post(`/api/dnd/world/${scope === "all" ? "alle" : slug}/events`, { kind, title, text, params });
    setBusy(false);
    if (!r.ok) { say("error", r.error); return; }
    say("info", "Ereignis ausgelöst");
    setTitle(""); setText("");
  };
  return (
    <div className={panel}>
      <p className={label}>🎭 Spielleiter</p>
      {node}
      <div className="grid gap-2 sm:grid-cols-2 pt-1 text-[11px] text-gray-400">
        <label>Art
          <select value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} className={field}>
            <option value="announce">Ansage (Text an alle)</option><option value="check">Gruppenprobe (alle würfeln)</option><option value="loot">Beute (Schnellste gewinnen)</option>
          </select>
        </label>
        <label>Wer erfährt es
          <select value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className={field}>
            <option value="here">Nur diese Location</option><option value="all">Alle Locations</option>
          </select>
        </label>
        <label className="sm:col-span-2">Titel<input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} className={field} placeholder="z. B. Ein Sturm zieht auf!" /></label>
        <label className="sm:col-span-2">Text<textarea value={text} maxLength={600} rows={2} onChange={(e) => setText(e.target.value)} className={field} /></label>
        {kind === "check" && (<>
          <label>Attribut<select value={ability} onChange={(e) => setAbility(e.target.value)} className={field}>{Object.entries(ABILITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>Schwierigkeitsgrad (5–25)<input type="number" min={5} max={25} value={dc} onChange={(e) => setDc(Number(e.target.value))} className={field} /></label>
        </>)}
        {kind === "loot" && (<>
          <label>Gold (0–200)<input type="number" min={0} max={200} value={gold} onChange={(e) => setGold(Number(e.target.value))} className={field} /></label>
          <label>Gegenstand<select value={item} onChange={(e) => setItem(e.target.value)} className={field}><option value="">Keiner</option>{ITEM_OPTIONS.map((i) => <option key={i.key} value={i.key}>{i.name}</option>)}</select></label>
          <label>Wie viele Gewinner<input type="number" min={1} max={20} value={max} onChange={(e) => setMax(Number(e.target.value))} className={field} /></label>
        </>)}
        <button type="button" disabled={busy || !title.trim()} onClick={() => void send()} className="sm:col-span-2 oq-btn oq-btn-primary text-xs py-2">Auslösen</button>
      </div>
    </div>
  );
}
