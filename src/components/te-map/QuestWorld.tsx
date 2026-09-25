"use client";

// ============================================
// OMA Quest — begehbare Welt einer Location (Seite /oma-quest/<slug>)
// ============================================
// Holt den Zustand vom Server (darf ich hier sein? wer ist noch da? Quest-Stand?) und zeigt dann die
// Spielwelt. Wer nicht an dieser Location angekommen ist, wird zur Weltkarte geschickt.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Loader2 } from "@/components/icons";
import TeWorld, { type ChatMessage, type LiveData, type OtherPlayer } from "./TeWorld";
import { EventCards, HudBar, ShopPanel } from "./play/PlayPanels";
import GameMenu, { type MenuTab } from "./play/GameMenu";
import { useGameFeed } from "./play/GameFeed";
import type { WorldEventView } from "@/lib/dnd/world-events";
import { allActorsOf } from "@/lib/te-map/interior";
import type { ChoiceResult } from "@/lib/te-map/engine";
import { getWorld } from "@/lib/te-map/worlds";
import type { TeCharacterConfig } from "@/lib/te-character";
import type { WorldDef } from "@/lib/te-map/types";
import type { TrackerItem } from "@/lib/dnd/quest-log";

interface LocationState {
  customWorld: WorldDef | null;
  location: { id: string; slug: string; name: string; description: string | null; locationType: string };
  canEnter: boolean;
  inTransit: boolean;
  myCardId: string | null;
  myCharacter: TeCharacterConfig;
  hasCharacter: boolean;
  questSteps: Record<string, number>;
  tracker: TrackerItem[];
  visits: { quest: string; title: string; step: number; completed: boolean }[];
  isGm: boolean;
  isMod: boolean;
  coins: number;
  biome: "temperate" | "cold" | "dry" | "cave";
  rpg: { flags: string[]; gold: number; xp: number; level: number } | null;
  present: { id: string; name: string; avatarUrl: string | null; character: TeCharacterConfig | null }[];
  eventLog: { id: string; title: string; text: string; xpGained: number; occurredAt: string; cardName: string }[];
  storyTick: { arrived: boolean; newEvent: { title: string; text: string; xpGained: number } | null } | null;
}

export default function QuestWorld({ slug }: { slug: string }) {
  const [data, setData] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [events, setEvents] = useState<WorldEventView[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [emote, setEmote] = useState<{ id: string; n: number } | null>(null);
  const [shopActor, setShopActor] = useState<string | null>(null);
  const [sheetKey, setSheetKey] = useState(0);
  const [menu, setMenu] = useState<MenuTab | null>(null);
  const { items: feed, push: notify } = useGameFeed();
  const staticWorld = useMemo(() => getWorld(slug), [slug]);
  const world = data?.customWorld ?? staticWorld ?? undefined;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dnd/location/${slug}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Location konnte nicht geladen werden."); return; }
        setData(json);
        if (json.storyTick?.newEvent) notify("info", json.storyTick.newEvent.title, json.storyTick.newEvent.text);
        for (const v of json.visits ?? []) notify(v.completed ? "reward" : "quest", v.completed ? `Quest abgeschlossen: ${v.title}` : `Quest-Fortschritt: ${v.title}`, "Du hast den Ort besucht.");
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, [slug, notify]);

  const onAdvance = useCallback(async (quest: string, from: number) => {
    try {
      const res = await fetch(`/api/dnd/world/${slug}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quest, from }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { step: number; completed: boolean; tracker?: TrackerItem[] };
    } catch {
      return null;
    }
  }, [slug]);

  const livePresence = useCallback(async (me: { x: number; y: number; dir: string; emote?: string; chatSince?: string; eventsSince?: string }) => {
    try {
      const res = await fetch(`/api/dnd/world/${slug}/presence`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(me) });
      if (!res.ok) return null;
      const json = await res.json();
      return { others: json.others ?? [], chat: json.chat ?? [], events: json.events ?? [] } as LiveData;
    } catch {
      return null;
    }
  }, [slug]);

  const onLiveData = useCallback((d: { chat: ChatMessage[]; hiddenChat: string[]; events: WorldEventView[] }) => {
    if (d.chat.length || d.hiddenChat.length) {
      setChat((c) => [...c, ...d.chat.filter((m) => !c.some((o) => o.id === m.id))].filter((m) => !d.hiddenChat.includes(m.id)).slice(-60));
    }
    if (d.events.length) setEvents((e) => [...e, ...d.events.filter((n) => !e.some((o) => o.id === n.id))]);
  }, []);

  const onChoose = useCallback(async (req: { actor: string; talk: number; choice: number }) => {
    try {
      const res = await fetch(`/api/dnd/world/${slug}/choice`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(req) });
      const json = await res.json();
      if (!res.ok) { notify("error", json.error ?? "Fehlgeschlagen."); return null; }
      const g = json.granted as { xp: number; gold: number; levelUp: number | null };
      const extra = [g.xp ? `+${g.xp} XP` : "", g.gold ? `+${g.gold} Gold` : "", ...(json.itemNames ?? [])].filter(Boolean).join(" · ");
      if (extra) notify("reward", "Belohnung", extra);
      if (g.levelUp) notify("level", `Stufe ${g.levelUp} erreicht!`, "Deine Proben werden mit der Zeit leichter.");
      setSheetKey((k) => k + 1);
      return { lines: json.lines, roll: json.roll, flags: json.flags, questSteps: json.questSteps, tracker: json.tracker } as ChoiceResult & { tracker?: import("@/lib/dnd/quest-log").TrackerItem[] };
    } catch {
      return null;
    }
  }, [slug, notify]);

  // Tastenkürzel fürs Menü (nicht beim Tippen in Feldern)
  useEffect(() => {
    const keys: Record<string, MenuTab> = { c: "character", i: "inventory", q: "quests", g: "party", t: "chat" };
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      if (e.key === "Escape") { setMenu(null); setShopActor(null); return; }
      if (typing) return;
      const tab = keys[e.key.toLowerCase()];
      if (tab) { e.preventDefault(); setMenu((m) => (m === tab ? null : tab)); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Beim Verlassen der Seite sofort austragen (sonst bleibt die Figur noch ~12 s stehen)
  const canEnterNow = !!data?.canEnter;
  useEffect(() => {
    if (!canEnterNow) return;
    const leave = () => navigator.sendBeacon?.(`/api/dnd/world/${slug}/presence`, new Blob([JSON.stringify({ leave: true })], { type: "application/json" }));
    window.addEventListener("pagehide", leave);
    return () => { window.removeEventListener("pagehide", leave); leave(); };
  }, [canEnterNow, slug]);

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-5 h-5 text-gray-500 animate-spin" />
      </div>
    );
  }
  if (!world) return <p className="text-sm text-gray-400">Für diese Location gibt es noch keine begehbare Welt.</p>;

  if (!data.canEnter) {
    return (
      <div className="oq-panel p-6 space-y-3 text-center max-w-md mx-auto">
        <h1 className="font-battle text-lg text-white">{data.location.name}</h1>
        <p className="text-sm text-gray-400">
          {data.inTransit
            ? "Du bist noch unterwegs. Sobald dein Charakter hier angekommen ist, kannst du den Ort betreten."
            : "Du bist gerade nicht an diesem Ort. Reise zuerst über die Weltkarte hierher."}
        </p>
        <Link href="/oma-quest" className="inline-flex rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold px-4 py-2 transition-colors">
          Zur Weltkarte
        </Link>
      </div>
    );
  }

  const others: OtherPlayer[] = data.present.map((p) => ({ id: p.id, name: p.name, character: p.character }));

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-battle text-lg text-white">{data.location.name}</h1>
        {data.location.description && <p className="text-xs text-gray-500">{data.location.description}</p>}
      </div>

      {!data.hasCharacter && (
        <p className="text-xs text-amber-300 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2">
          Du hast noch keinen eigenen Charakter — das ist eine Standardfigur.{" "}
          <Link href="/battle-cards/my-card" className="underline">Gestalte deinen Charakter</Link>, damit du dich hier wiedererkennst.
        </p>
      )}

      <TeWorld
        world={world} character={data.myCharacter} initialSteps={data.questSteps} tracker={data.tracker} others={others}
        livePresence={livePresence} onLiveData={onLiveData} myCardId={data.myCardId ?? undefined} biome={data.biome} emote={emote} flags={data.rpg?.flags ?? []}
        onChoose={onChoose} onTrade={setShopActor} onAdvance={onAdvance}
        feed={feed} notify={notify} paused={!!menu || !!shopActor}
        hud={<HudBar refreshKey={sheetKey} />}
        extraControls={(
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {([
              ["character", "🧙", "Charakter (C)"],
              ["inventory", "🎒", "Inventar (I)"],
              ["quests", "📜", "Quests (Q)"],
              ["party", "👥", "Gruppe (G)"],
              ["chat", "💬", "Chat (T)"],
              ...(data.isGm ? [["gm", "🎭", "Spielleiter"]] : []),
            ] as [MenuTab, string, string][]).map(([tab, icon, title]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setMenu((m) => (m === tab ? null : tab))}
                title={title}
                aria-label={title}
                aria-pressed={menu === tab}
                className={`oq-btn h-11 w-11 text-xl grid place-items-center ${menu === tab ? "oq-btn-gold" : ""}`}
              >
                {icon}
              </button>
            ))}
          </div>
        )}
        overlay={(
          <>
            {events.filter((e) => !dismissed.has(e.id)).length > 0 && (
              <div className="absolute right-2 top-12 z-30 w-[min(92%,360px)] space-y-2">
                <EventCards events={events.filter((e) => !dismissed.has(e.id))} onDismiss={(id) => setDismissed((d) => new Set(d).add(id))} onChanged={() => setSheetKey((k) => k + 1)} notify={notify} />
              </div>
            )}
            {menu && (
              <GameMenu
                tab={menu} onClose={() => setMenu(null)} slug={slug} present={data.present.map((p) => ({ id: p.id, name: p.name }))}
                myCardId={data.myCardId} chat={chat} isMod={data.isMod} isGm={data.isGm} notify={notify} refreshKey={sheetKey} onChanged={() => setSheetKey((k) => k + 1)}
                onEmote={(id) => setEmote((e) => ({ id, n: (e?.n ?? 0) + 1 }))} onChatRemoved={(id) => setChat((c) => c.filter((m) => m.id !== id))}
              />
            )}
            {shopActor && (() => {
              const m = allActorsOf(world.map).find((a) => a.id === shopActor && a.kind === "merchant");
              return m ? <ShopPanel slug={slug} actorId={m.id} merchantName={m.name} shop={m.shop ?? []} onClose={() => setShopActor(null)} onSheetChanged={() => setSheetKey((k) => k + 1)} notify={notify} /> : null;
            })()}
          </>
        )}
      />

      {data.present.length > 0 && (
        <div className="oq-panel p-4">
          <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest mb-2">Auch hier</p>
          <ul className="flex flex-wrap gap-3">
            {data.present.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-xs text-gray-300">
                {p.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-zinc-800 grid place-items-center text-[10px] font-bold text-white">{p.name.charAt(0).toUpperCase()}</span>
                )}
                {p.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="oq-panel p-4 space-y-2">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-widest">Story</p>
        {data.eventLog.length === 0 ? (
          <p className="text-xs text-gray-500">Hier ist noch nichts passiert.</p>
        ) : (
          <ul className="space-y-2">
            {data.eventLog.map((e) => (
              <li key={e.id} className="text-xs">
                <span className="font-bold text-white">{e.cardName}</span>{" "}
                <span className="text-gray-400">— {e.title}: {e.text}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
