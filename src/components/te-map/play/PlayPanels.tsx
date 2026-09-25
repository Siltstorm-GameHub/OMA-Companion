"use client";

// ============================================
// OMA Quest — Spiel-Panels: Chat (mit Moderation), Ereignisse, Händler, Charakter, Inventar, Gruppe, Spielleiter, HUD
// ============================================

import { useEffect, useState } from "react";
import { EMOTE_ICONS, type ChatMessage } from "@/components/te-map/TeWorld";
import { useNotice, type Notify } from "@/components/te-map/play/GameFeed";
import { D20 } from "@/components/te-map/play/Dice";
import type { CharacterSheet } from "@/lib/dnd/rpg-server";
import type { PartyView, InviteView } from "@/lib/dnd/party";
import type { WorldEventView } from "@/lib/dnd/world-events";
import { getItem, ITEMS as ITEM_OPTIONS, SLOT_LABEL, sellPrice, type ItemSlot } from "@/lib/dnd/items";
import { ABILITY_LABEL, ABILITY_SHORT } from "@/lib/te-map/rpg";

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

// ── Kopfzeile im Spiel (Stufe, XP, Gold, Münzen) ────────────

export function HudBar({ refreshKey = 0 }: { refreshKey?: number }) {
  const sheet = useSheet(refreshKey);
  if (!sheet) return null;
  return (
    <div className="oq-panel flex items-center gap-3 px-3 py-1.5 text-xs text-white">
      <span className="font-black text-violet-200">Stufe {sheet.level}</span>
      <span className="w-24 h-2 rounded-full bg-black/60 border border-white/15 overflow-hidden" title={`${sheet.xp} XP`}><span className="block h-full bg-violet-400" style={{ width: `${Math.round(sheet.progress * 100)}%` }} /></span>
      <span className="font-bold text-amber-300" title="Gold (im Spiel)">🪙 {sheet.gold}</span>
      {sheet.coins !== undefined && <span className="font-bold text-yellow-200" title="OMA-Münzen (App)">💰 {sheet.coins}</span>}
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
              <p className="text-sm font-black text-amber-200">{e.kind === "announce" ? "📣" : e.kind === "check" ? "🎲" : "💰"} {e.title}</p>
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
          <span className="ml-auto text-xs text-amber-300 font-bold">🪙 {sheet?.gold ?? "…"}</span>
          <button type="button" onClick={onClose} className={btn}>Schließen</button>
        </div>
        {node}
        <p className={label}>Angebot</p>
        <ul className="space-y-1.5">
          {shop.map((k) => { const it = getItem(k); return it ? (
            <li key={k} className="flex items-center gap-2 text-xs text-white">
              <span className="oq-slot w-9 h-9 grid place-items-center text-xl">{it.emoji}</span>
              <span className="min-w-0"><b>{it.name}</b> <span className="text-gray-500">({SLOT_LABEL[it.slot]}{it.bonus ? `, +${it.bonus.value} ${ABILITY_SHORT[it.bonus.ability]}` : ""})</span><br /><span className="text-gray-400">{it.desc}</span></span>
              <button type="button" disabled={!sheet || sheet.gold < it.price} onClick={() => void trade(k, "buy")} className={`${btn} oq-btn-gold ml-auto shrink-0`}>{it.price} 🪙</button>
            </li>) : null; })}
          {shop.length === 0 && <li className="text-xs text-gray-500">Der Händler hat gerade nichts im Angebot.</li>}
        </ul>
        <p className={label}>Dein Rucksack</p>
        {sheet && sheet.inventory.length === 0 && <p className="text-xs text-gray-500">Leer.</p>}
        <ul className="space-y-1.5">
          {sheet?.inventory.map((e) => (
            <li key={e.key} className="flex items-center gap-2 text-xs text-white">
              <span className="oq-slot w-9 h-9 grid place-items-center text-xl">{e.item.emoji}</span><span>{e.item.name}{e.qty > 1 ? ` ×${e.qty}` : ""}{e.equipped ? " (angelegt)" : ""}</span>
              <button type="button" onClick={() => void trade(e.key, "sell")} className={`${btn} ml-auto`}>Verkaufen · {sellPrice(e.item)} 🪙</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Charakter (Stufe, Gold, Münzen, Attribute) ──────────────

export function CharacterPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const sheet = useSheet(refreshKey);
  if (!sheet) return null;
  return (
    <div className={panel}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <p className="text-base font-black text-white">{sheet.name}</p>
        <span className="text-sm font-black text-violet-200">Stufe {sheet.level}</span>
        <span className="text-xs text-amber-300 font-bold" title="Gold im Spiel">🪙 {sheet.gold} Gold</span>
        {sheet.coins !== undefined && <span className="text-xs text-yellow-200 font-bold" title="OMA-Münzen der App">💰 {sheet.coins} Münzen</span>}
      </div>
      <div>
        <div className="h-2.5 rounded-full bg-black/60 border border-white/15 overflow-hidden"><div className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-400" style={{ width: `${Math.round(sheet.progress * 100)}%` }} /></div>
        <p className="text-[10px] text-gray-500 mt-0.5">{sheet.xp} XP{sheet.level < 20 ? ` — nächste Stufe bei ${sheet.xpForNextLevel}` : " — Höchststufe"}</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {sheet.abilities.map((a) => (
          <div key={a.key} className="oq-slot px-2 py-1.5 text-center" title={ABILITY_LABEL[a.key]}>
            <p className="text-[9px] text-gray-500 font-bold">{ABILITY_SHORT[a.key]}</p>
            <p className="text-base font-black text-white">{a.score}</p>
            <p className="text-[10px] text-sky-300">{a.mod + a.equipment >= 0 ? "+" : "−"}{Math.abs(a.mod + a.equipment)}{a.equipment ? " ⚙" : ""}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-500">Proben: d20 + Modifikator (+ 1 je 3 Stufen) gegen den Schwierigkeitsgrad. ⚙ = Bonus durch Ausrüstung.</p>
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
        <span className="ml-auto text-xs font-bold text-amber-300">🪙 {sheet.gold}</span>
        {sheet.coins !== undefined && <span className="text-xs font-bold text-yellow-200">💰 {sheet.coins}</span>}
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
            <p className="text-[11px] text-gray-400">{SLOT_LABEL[selected.item.slot]}{selected.item.bonus ? ` · +${selected.item.bonus.value} ${ABILITY_LABEL[selected.item.bonus.ability]} auf Proben` : ""} · Wert {selected.item.price} 🪙</p>
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
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = () => fetch("/api/dnd/party").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) { setParty(j.party); setInvites(j.invites); } }).catch(() => {});
    void load();
    const t = setInterval(load, 15_000);
    return () => { cancelled = true; clearInterval(t); };
  }, [reload]);

  const act = async (body: Record<string, unknown>, ok?: string) => {
    const r = await post("/api/dnd/party", body);
    if (!r.ok) { say("error", r.error); return; }
    if (ok) say("info", ok);
    setReload((n) => n + 1);
  };
  const memberIds = new Set(party?.members.map((m) => m.cardId));
  const candidates = present.filter((p) => p.id !== myCardId && !memberIds.has(p.id));

  return (
    <div className={panel}>
      <p className={label}>Gruppe</p>
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
          <ul className="flex flex-wrap gap-2 text-xs">
            {party.members.map((m) => (
              <li key={m.cardId} className={`rounded-full border px-2.5 py-1 ${m.here ? "border-emerald-400/40 text-emerald-200" : "border-white/10 text-gray-400"}`}>
                {m.cardId === party.leaderCardId ? "👑 " : ""}{m.name}{m.here ? "" : " (woanders)"}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-gray-500">Schließt jemand eine Location-Quest ab, bekommen Gruppenmitglieder am selben Ort die Hälfte der XP.</p>
          <button type="button" onClick={() => void act({ action: "leave" })} className={btn}>Gruppe verlassen</button>
        </>
      ) : <p className="text-xs text-gray-500">Du bist in keiner Gruppe. Lade Spieler ein, die mit dir am selben Ort sind (bis zu 4 Mitglieder).</p>}
      {(!party || party.members.length < 4) && candidates.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {candidates.map((c) => <button key={c.id} type="button" onClick={() => void act({ action: "invite", cardId: c.id }, `${c.name} eingeladen`)} className={btn}>+ {c.name}</button>)}
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
