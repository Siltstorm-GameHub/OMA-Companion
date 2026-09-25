"use client";

// ============================================
// OMA Quest — begehbare Welt einer Location (Seite /oma-quest/<slug>)
// ============================================
// Holt den Zustand vom Server (darf ich hier sein? wer ist noch da? Quest-Stand?) und zeigt dann die
// Spielwelt. Wer nicht an dieser Location angekommen ist, wird zur Weltkarte geschickt.

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "@/components/icons";
import TeWorld, { type OtherPlayer } from "./TeWorld";
import { getWorld } from "@/lib/te-map/worlds";
import type { TeCharacterConfig } from "@/lib/te-character";

interface LocationState {
  location: { id: string; slug: string; name: string; description: string | null; locationType: string };
  canEnter: boolean;
  inTransit: boolean;
  myCardId: string | null;
  myCharacter: TeCharacterConfig;
  hasCharacter: boolean;
  questStep: number;
  present: { id: string; name: string; avatarUrl: string | null; character: TeCharacterConfig | null }[];
  eventLog: { id: string; title: string; text: string; xpGained: number; occurredAt: string; cardName: string }[];
  storyTick: { arrived: boolean; newEvent: { title: string; text: string; xpGained: number } | null } | null;
}

export default function QuestWorld({ slug }: { slug: string }) {
  const [data, setData] = useState<LocationState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const world = useMemo(() => getWorld(slug), [slug]);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dnd/location/${slug}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Location konnte nicht geladen werden."); return; }
        setData(json);
        if (json.storyTick?.newEvent) toast(json.storyTick.newEvent.title, { description: json.storyTick.newEvent.text });
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, [slug]);

  const onAdvance = useCallback(async (from: number) => {
    try {
      const res = await fetch(`/api/dnd/world/${slug}/step`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from }),
      });
      if (!res.ok) return null;
      return (await res.json()) as { step: number; completed: boolean };
    } catch {
      return null;
    }
  }, [slug]);

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
      <div className="moba-panel rounded-2xl p-6 space-y-3 text-center max-w-md mx-auto">
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

      <TeWorld world={world} character={data.myCharacter} initialStep={data.questStep} others={others} onAdvance={onAdvance} />

      {data.present.length > 0 && (
        <div className="moba-panel rounded-2xl p-4">
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

      <div className="moba-panel rounded-2xl p-4 space-y-2">
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
