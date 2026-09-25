"use client";

// ============================================
// OMA Quest — Spiel-Panels unter der Welt: Chat/Emotes, Spielleiter-Ereignisse, Händler, Charakterbogen, Gruppe
// ============================================

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EMOTE_ICONS, type ChatMessage } from "@/components/te-map/TeWorld";
import type { CharacterSheet } from "@/lib/dnd/rpg-server";
import type { PartyView, InviteView } from "@/lib/dnd/party";
import type { WorldEventView } from "@/lib/dnd/world-events";
import { getItem, ITEMS as ITEM_OPTIONS, SLOT_LABEL, sellPrice } from "@/lib/dnd/items";
import { ABILITY_LABEL, ABILITY_SHORT } from "@/lib/te-map/rpg";

const panel = "moba-panel rounded-2xl p-4 space-y-2";
const label = "text-[10px] font-semibold text-violet-400 uppercase tracking-widest";
const btn = "rounded-lg border border-white/15 text-gray-200 text-xs font-semibold px-3 py-1.5 hover:border-white/30 disabled:opacity-40";

async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<{ ok: true; data: T } | { ok: false; error: string }> {
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, data: json as T } : { ok: false, error: json.error ?? "Fehlgeschlagen." };
  } catch {
    return { ok: false, error: "Netzwerkfehler." };
  }
}

// ── Chat + Emotes ───────────────────────────────────────────

export function SocialPanel({ slug, chat, onEmote }: { slug: string; chat: ChatMessage[]; onEmote: (id: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setBusy(true);
    const r = await post(`/api/dnd/world/${slug}/chat`, { text: t });
    setBusy(false);
    if (!r.ok) { toast.error(r.error); return; }
    setText("");
  };
  return (
    <div className={panel}>
      <p className={label}>Chat in dieser Location</p>
      <div className="max-h-32 overflow-y-auto space-y-0.5 text-xs" aria-live="polite">
        {chat.length === 0 ? <p className="text-gray-500">Noch ruhig hier. Sag etwas — wer gerade da ist, sieht deine Sprechblase.</p> : chat.slice(-30).map((m) => (
          <p key={m.id} className="text-gray-300"><span className="font-bold text-amber-200">{m.name}:</span> {m.text}</p>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(); }} className="flex gap-2">
        <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="Nachricht …" className="flex-1 rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-xs text-white" />
        <button type="submit" disabled={busy || !text.trim()} className={btn}>Senden</button>
      </form>
      <div className="flex flex-wrap gap-1.5">
        {Object.entries(EMOTE_ICONS).map(([id, icon]) => (
          <button key={id} type="button" onClick={() => onEmote(id)} aria-label={`Emote ${id}`} className="rounded-lg border border-white/10 hover:border-white/30 px-2 py-1 text-base">{icon}</button>
        ))}
      </div>
    </div>
  );
}

// ── Spielleiter-Ereignisse ──────────────────────────────────

interface EventResult { roll?: { roll: number; modifier: number; total: number; dc: number; success: boolean }; success: boolean; text: string; gold?: number; itemName?: string; results?: { name: string; total: number; success: boolean }[] }

export function EventCards({ events, onDismiss, onChanged }: { events: WorldEventView[]; onDismiss: (id: string) => void; onChanged: () => void }) {
  const [res, setRes] = useState<Record<string, EventResult>>({});
  const respond = async (id: string) => {
    const r = await post<EventResult>(`/api/dnd/events/${id}`, {});
    if (!r.ok) { toast.error(r.error); return; }
    setRes((m) => ({ ...m, [id]: r.data }));
    onChanged();
  };
  if (!events.length) return null;
  return (
    <div className="space-y-2">
      {events.map((e) => {
        const r = res[e.id];
        return (
          <div key={e.id} className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4 space-y-1.5">
            <div className="flex items-start gap-2">
              <p className="text-sm font-bold text-amber-200">{e.kind === "announce" ? "📣" : e.kind === "check" ? "🎲" : "💰"} {e.title}</p>
              <span className="text-[10px] text-gray-400">{e.authorName}{e.everywhere ? " · überall" : ""}</span>
              <button type="button" onClick={() => onDismiss(e.id)} aria-label="Ausblenden" className="ml-auto text-gray-400 hover:text-white">✕</button>
            </div>
            {e.text && <p className="text-xs text-gray-200">{e.text}</p>}
            {e.kind === "check" && e.check && !r && (
              <button type="button" onClick={() => void respond(e.id)} className="rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-3 py-1.5">🎲 Würfeln ({ABILITY_LABEL[e.check.ability]}, SG {e.check.dc})</button>
            )}
            {e.kind === "loot" && e.loot && !r && (
              <button type="button" onClick={() => void respond(e.id)} className="rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold px-3 py-1.5">
                Zugreifen ({e.loot.gold ? `${e.loot.gold} Gold` : ""}{e.loot.gold && e.loot.item ? " + " : ""}{e.loot.item ? getItem(e.loot.item)?.name ?? e.loot.item : ""}) — nur {e.loot.max}
              </button>
            )}
            {r && (
              <div className={`rounded-lg px-3 py-2 text-xs font-bold ${r.success ? "bg-emerald-500/20 text-emerald-200" : "bg-red-500/20 text-red-200"}`}>
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

// ── Händler ─────────────────────────────────────────────────

export function ShopPanel({ slug, actorId, merchantName, shop, onClose, onSheetChanged }: { slug: string; actorId: string; merchantName: string; shop: string[]; onClose: () => void; onSheetChanged: () => void }) {
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/character/sheet").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setSheet(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [reload]);

  const trade = async (item: string, action: "buy" | "sell") => {
    const r = await post(`/api/dnd/world/${slug}/shop`, { actor: actorId, item, action });
    if (!r.ok) { toast.error(r.error); return; }
    setReload((n) => n + 1);
    onSheetChanged();
  };
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4" role="dialog" aria-label={`Händler ${merchantName}`}>
      <div className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-amber-300/30 bg-[#0b1220] p-4 space-y-3">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold text-amber-200">🛒 {merchantName}</p>
          <span className="ml-auto text-xs text-amber-300 font-bold">{sheet?.gold ?? "…"} Gold</span>
          <button type="button" onClick={onClose} className={btn}>Schließen</button>
        </div>
        <p className={label}>Angebot</p>
        <ul className="space-y-1.5">
          {shop.map((k) => { const it = getItem(k); return it ? (
            <li key={k} className="flex items-center gap-2 text-xs text-white">
              <span className="text-lg">{it.emoji}</span>
              <span className="min-w-0"><b>{it.name}</b> <span className="text-gray-500">({SLOT_LABEL[it.slot]}{it.bonus ? `, +${it.bonus.value} ${ABILITY_SHORT[it.bonus.ability]}` : ""})</span><br /><span className="text-gray-400">{it.desc}</span></span>
              <button type="button" disabled={!sheet || sheet.gold < it.price} onClick={() => void trade(k, "buy")} className={`${btn} ml-auto shrink-0`}>{it.price} Gold</button>
            </li>) : null; })}
        </ul>
        <p className={label}>Dein Rucksack</p>
        {sheet && sheet.inventory.length === 0 && <p className="text-xs text-gray-500">Leer.</p>}
        <ul className="space-y-1.5">
          {sheet?.inventory.map((e) => (
            <li key={e.key} className="flex items-center gap-2 text-xs text-white">
              <span className="text-lg">{e.item.emoji}</span><span>{e.item.name}{e.qty > 1 ? ` ×${e.qty}` : ""}{e.equipped ? " (angelegt)" : ""}</span>
              <button type="button" onClick={() => void trade(e.key, "sell")} className={`${btn} ml-auto`}>Verkaufen · {sellPrice(e.item)}</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Charakterbogen ──────────────────────────────────────────

export function CharacterPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [sheet, setSheet] = useState<CharacterSheet | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/dnd/character/sheet").then((r) => (r.ok ? r.json() : null)).then((j) => { if (!cancelled && j) setSheet(j); }).catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  const equip = async (item: string, equipped: boolean) => {
    const r = await post<CharacterSheet>("/api/dnd/character/equip", { item, equipped });
    if (!r.ok) { toast.error(r.error); return; }
    setSheet(r.data);
  };
  if (!sheet) return null;
  return (
    <div className={panel}>
      <div className="flex flex-wrap items-center gap-3">
        <p className={label}>Charakterbogen</p>
        <span className="text-sm font-bold text-white">{sheet.name} · Stufe {sheet.level}</span>
        <span className="text-xs text-amber-300 font-bold">{sheet.gold} Gold</span>
      </div>
      <div>
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${Math.round(sheet.progress * 100)}%` }} /></div>
        <p className="text-[10px] text-gray-500 mt-0.5">{sheet.xp} XP{sheet.level < 20 ? ` — nächste Stufe bei ${sheet.xpForNextLevel}` : " — Höchststufe"}</p>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {sheet.abilities.map((a) => (
          <div key={a.key} className="rounded-lg border border-white/10 px-2 py-1.5 text-center" title={ABILITY_LABEL[a.key]}>
            <p className="text-[9px] text-gray-500 font-bold">{ABILITY_SHORT[a.key]}</p>
            <p className="text-sm font-bold text-white">{a.score}</p>
            <p className="text-[10px] text-sky-300">{a.mod + a.equipment >= 0 ? "+" : "−"}{Math.abs(a.mod + a.equipment)}{a.equipment ? " ⚙" : ""}</p>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gray-500">Proben: d20 + Modifikator (+ 1 je 3 Stufen) gegen den Schwierigkeitsgrad. ⚙ = Bonus durch Ausrüstung.</p>
      <p className={label}>Rucksack</p>
      {sheet.inventory.length === 0 ? <p className="text-xs text-gray-500">Noch nichts — Händler und Beute in den Locations füllen ihn.</p> : (
        <ul className="space-y-1">
          {sheet.inventory.map((e) => (
            <li key={e.key} className="flex items-center gap-2 text-xs text-white">
              <span className="text-base">{e.item.emoji}</span>
              <span className="min-w-0">{e.item.name}{e.qty > 1 ? ` ×${e.qty}` : ""} <span className="text-gray-500">({SLOT_LABEL[e.item.slot]}{e.item.bonus ? `, +${e.item.bonus.value} ${ABILITY_SHORT[e.item.bonus.ability]}` : ""})</span></span>
              {e.item.slot !== "loot" && <button type="button" onClick={() => void equip(e.key, !e.equipped)} className={`${btn} ml-auto`}>{e.equipped ? "Ablegen" : "Anlegen"}</button>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Gruppe ──────────────────────────────────────────────────

export function PartyPanel({ present, myCardId }: { present: { id: string; name: string }[]; myCardId: string | null }) {
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
    if (!r.ok) { toast.error(r.error); return; }
    if (ok) toast.success(ok);
    setReload((n) => n + 1);
  };
  const memberIds = new Set(party?.members.map((m) => m.cardId));
  const candidates = present.filter((p) => p.id !== myCardId && !memberIds.has(p.id));

  return (
    <div className={panel}>
      <p className={label}>Gruppe</p>
      {invites.map((i) => (
        <div key={i.id} className="flex items-center gap-2 text-xs text-white rounded-lg border border-violet-400/40 bg-violet-500/10 px-3 py-2">
          <span><b>{i.fromName}</b> lädt dich in eine Gruppe ein.</span>
          <button type="button" onClick={() => void act({ action: "accept", inviteId: i.id }, "Gruppe beigetreten")} className={`${btn} ml-auto`}>Annehmen</button>
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

export function GmPanel({ slug }: { slug: string }) {
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
    if (!r.ok) { toast.error(r.error); return; }
    toast.success("Ereignis ausgelöst");
    setTitle(""); setText("");
  };
  return (
    <details className={panel}>
      <summary className={`${label} cursor-pointer`}>🎭 Spielleiter</summary>
      <div className="grid gap-2 sm:grid-cols-2 pt-2 text-[11px] text-gray-400">
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
        <button type="button" disabled={busy || !title.trim()} onClick={() => void send()} className="sm:col-span-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold py-2">Auslösen</button>
      </div>
    </details>
  );
}

