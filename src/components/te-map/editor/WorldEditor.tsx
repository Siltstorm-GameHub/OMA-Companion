"use client";

// ============================================
// Welten-Editor (Seite /oma-quest/editor/<id>): Karte, Quest & Dialoge, Ausprobieren, Einreichen
// ============================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useGameFeed } from "@/components/te-map/play/GameFeed";
import { Loader2 } from "@/components/icons";
import TeWorld from "@/components/te-map/TeWorld";
import { defaultTeConfig } from "@/lib/te-character";
import { docToWorld, LIMITS, validateForSubmit, type CustomWorldDoc } from "@/lib/te-map/custom-world";
import type { Hex } from "@/lib/dnd/hex/grid";
import { resolveCheck } from "@/lib/te-map/rpg";
import { worldQuestsOf } from "@/lib/te-map/types";
import HexPicker from "./HexPicker";
import MapEditor from "./MapEditor";
import QuestEditor from "./QuestEditor";

interface Loaded {
  id: string;
  slug: string;
  status: "DRAFT" | "PENDING" | "PUBLISHED" | "REJECTED";
  doc: CustomWorldDoc;
  hex: Hex | null;
  canEdit: boolean;
  isAdmin: boolean;
}

type Tab = "map" | "quest" | "test";

const STATUS_LABEL = {
  draft: { text: "Entwurf", cls: "bg-zinc-700/60 text-gray-200" },
  published: { text: "Veröffentlicht", cls: "bg-emerald-500/20 text-emerald-300" },
};

const HISTORY_MAX = 60;

export default function WorldEditor({ id }: { id: string }) {
  const [data, setData] = useState<Loaded | null>(null);
  const [doc, setDoc] = useState<CustomWorldDoc | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("map");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const { items: testFeed, push: testNotify } = useGameFeed();
  const [focusActor, setFocusActor] = useState<string | null>(null);
  const history = useRef<CustomWorldDoc[]>([]);
  const future = useRef<CustomWorldDoc[]>([]);
  const docRef = useRef<CustomWorldDoc | null>(null);
  const [hex, setHexState] = useState<Hex | null>(null);
  const hexRef = useRef<Hex | null>(null);
  const [stack, setStack] = useState({ undo: 0, redo: 0 });
  const syncStack = () => setStack({ undo: history.current.length, redo: future.current.length });

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/dnd/custom-worlds/${id}`)
      .then(async (res) => {
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(json.error ?? "Konnte nicht geladen werden."); return; }
        setData(json);
        setDoc(json.doc);
        docRef.current = json.doc;
        hexRef.current = json.hex;
        setHexState(json.hex);
      })
      .catch(() => { if (!cancelled) setError("Netzwerkfehler."); });
    return () => { cancelled = true; };
  }, [id]);

  const change = useCallback((next: CustomWorldDoc) => {
    docRef.current = next;
    setDoc(next);
    setDirty(true);
  }, []);
  const beginEdit = useCallback(() => {
    if (!docRef.current) return;
    history.current.push(docRef.current);
    if (history.current.length > HISTORY_MAX) history.current.shift();
    future.current = [];
    syncStack();
  }, []);
  const undo = useCallback(() => {
    const prev = history.current.pop();
    if (!prev || !docRef.current) return;
    future.current.push(docRef.current);
    change(prev);
    syncStack();
  }, [change]);
  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !docRef.current) return;
    history.current.push(docRef.current);
    change(next);
    syncStack();
  }, [change]);

  const save = useCallback(async (): Promise<boolean> => {
    const current = docRef.current;
    if (!current) return false;
    setBusy("save");
    try {
      const res = await fetch(`/api/dnd/custom-worlds/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ doc: current, hex: hexRef.current }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.error ?? "Speichern fehlgeschlagen."); return false; }
      setDirty(false);
      if (json.syncError) toast.warning(json.syncError);
      else toast.success("Gespeichert");
      return true;
    } finally {
      setBusy(null);
    }
  }, [id]);

  // Tastenkürzel: Strg+S speichern, Strg+Z / Strg+Y rückgängig / wiederholen (nicht beim Tippen)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const typing = e.target instanceof HTMLElement && ["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName);
      const k = e.key.toLowerCase();
      if (k === "s") { e.preventDefault(); void save(); }
      else if (!typing && k === "z") { e.preventDefault(); if (e.shiftKey) redo(); else undo(); }
      else if (!typing && k === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [save, undo, redo]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const docProblems = useMemo(() => {
    if (!doc) return [];
    const v = validateForSubmit(doc);
    return v.ok ? [] : v.errors;
  }, [doc]);
  // Autoren ohne Admin-Recht müssen sich ihr Feld selbst aussuchen; Admins dürfen es offen lassen (Automatik)
  const needsHex = !!data && !data.isAdmin && data.status !== "PUBLISHED" && !hex;
  const problems = needsHex ? ["Wähle ein leeres Feld auf der Weltkarte für deine Location.", ...docProblems] : docProblems;
  const testWorld = useMemo(() => (tab === "test" && doc ? docToWorld(doc) : null), [tab, doc]);

  const publish = async () => {
    if (dirty && !(await save())) return;
    setBusy("publish");
    try {
      const res = await fetch(`/api/dnd/custom-worlds/${id}/publish`, { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(json.problems?.[0] ?? json.error ?? "Veröffentlichen fehlgeschlagen."); return; }
      toast.success("Veröffentlicht — die Location ist jetzt auf der Weltkarte.");
      setData((d) => (d ? { ...d, status: "PUBLISHED" } : d));
    } finally {
      setBusy(null);
    }
  };

  if (error) return <p className="text-sm text-red-400">{error}</p>;
  if (!data || !doc) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-gray-500 animate-spin" /></div>;

  const readOnly = !data.canEdit;
  const published = data.status === "PUBLISHED";
  const status = published ? STATUS_LABEL.published : STATUS_LABEL.draft;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/oma-quest/editor" className="text-xs text-gray-400 hover:text-white">← Meine Locations</Link>
        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${status.cls}`}>{status.text}</span>
        {dirty && <span className="text-[10px] text-amber-300">Ungespeichert</span>}
        <div className="ml-auto flex items-center gap-2">
          {!readOnly && (
            <>
              <button type="button" onClick={undo} disabled={!stack.undo} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 disabled:opacity-40" title="Strg+Z">↶ Rückgängig</button>
              <button type="button" onClick={redo} disabled={!stack.redo} className="rounded-lg border border-white/15 px-2.5 py-1.5 text-[11px] font-semibold text-gray-300 disabled:opacity-40" title="Strg+Y">↷</button>
              <button type="button" onClick={() => void save()} disabled={busy !== null || !dirty} className="rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 px-3 py-1.5 text-[11px] font-bold text-white">
                {busy === "save" ? "Speichert …" : "Speichern"}
              </button>
            </>
          )}
          {!published && (
            <button type="button" onClick={() => void publish()} disabled={busy !== null || problems.length > 0} title={problems.length ? "Erst die offenen Punkte beheben" : undefined} className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 px-3 py-1.5 text-[11px] font-bold text-white">
              {busy === "publish" ? "Veröffentlicht …" : "Veröffentlichen"}
            </button>
          )}
        </div>
      </div>

      {published && <p className="text-xs text-emerald-300/90 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2">Diese Location ist live. Änderungen wirken sofort — sie muss dafür spielbar bleiben, sonst wird nicht gespeichert. Admins werden über Änderungen informiert.</p>}

      <HexPicker
        value={hex}
        ownSlug={data.slug}
        readOnly={readOnly || published}
        onChange={(h) => { hexRef.current = h; setHexState(h); setDirty(true); }}
      />

      {!readOnly && (
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <label className="text-[11px] text-gray-400">Name der Location
            <input value={doc.title} maxLength={LIMITS.titleLen} onFocus={beginEdit} onChange={(e) => change({ ...doc, title: e.target.value })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-sm text-white" />
          </label>
          <label className="text-[11px] text-gray-400">Kurzbeschreibung (für die Weltkarte)
            <input value={doc.description} maxLength={LIMITS.descLen} onFocus={beginEdit} onChange={(e) => change({ ...doc, description: e.target.value })} className="mt-0.5 w-full rounded bg-zinc-900 border border-white/10 px-2 py-1.5 text-sm text-white" />
          </label>
        </div>
      )}

      <div className="flex gap-1 border-b border-white/10">
        {([["map", "Karte"], ["quest", "Quest & Dialoge"], ["test", "Ausprobieren"]] as [Tab, string][]).map(([k, label]) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={`px-3 py-2 text-xs font-bold border-b-2 -mb-px ${tab === k ? "border-violet-400 text-white" : "border-transparent text-gray-500 hover:text-gray-300"}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === "map" && <MapEditor doc={doc} readOnly={readOnly} onChange={change} onBeginEdit={beginEdit} onQuestFocus={(actorId) => { setFocusActor(actorId); setTab("quest"); }} />}
      {tab === "quest" && <QuestEditor doc={doc} readOnly={readOnly} onChange={(d) => { change(d); }} focusActorId={focusActor} ownSlug={data.slug} />}
      {tab === "test" && testWorld && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500">Probelauf mit deiner Standardfigur. Fortschritte werden nicht gespeichert.</p>
          <TeWorld
            world={testWorld}
            character={defaultTeConfig()}
            initialSteps={{}}
            tracker={[]}
            feed={testFeed}
            notify={testNotify}
            others={[]}
            onChoose={async ({ actor, talk, choice }) => {
              // Probelauf: würfelt lokal mit Durchschnittswerten (Wert 12, Stufe 1); nichts wird gespeichert
              const t = testWorld.map.actors.find((x) => x.id === actor)?.talk[talk];
              const c = t?.choices?.[choice];
              if (!t || !c) return null;
              let outcome = c.success;
              const roll = c.check ? resolveCheck({ ability: c.check.ability, dc: c.check.dc, score: 12, level: 1 }) : undefined;
              if (roll && !roll.success) outcome = c.fail ?? { lines: ["Es misslingt."] };
              return {
                lines: outcome.lines, roll, flags: outcome.flags,
                questSteps: outcome.advance && typeof t.step === "number" ? { [t.quest ?? testWorld.quest.slug]: t.step + 1 } : undefined,
              };
            }}
            onAdvance={async (quest, from) => ({ step: from + 1, completed: from + 1 >= (worldQuestsOf(testWorld).find((q) => q.slug === quest)?.objectives.length ?? 1) - 1 })}
          />
        </div>
      )}

      {/* Prüfung */}
      <div className={`rounded-2xl border px-4 py-3 text-xs ${problems.length ? "border-amber-400/30 bg-amber-400/5" : "border-emerald-400/30 bg-emerald-400/5"}`}>
        {problems.length === 0 ? (
          <p className="text-emerald-300 font-semibold">Alles in Ordnung — die Location ist spielbar${published ? "" : " und kann veröffentlicht werden"}.</p>
        ) : (
          <>
            <p className="text-amber-300 font-semibold mb-1">Vor dem Veröffentlichen noch zu erledigen:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-gray-300">{problems.map((p, i) => <li key={i}>{p}</li>)}</ul>
          </>
        )}
      </div>
    </div>
  );
}
