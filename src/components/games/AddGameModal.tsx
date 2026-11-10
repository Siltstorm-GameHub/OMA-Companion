"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import GameCover from "@/components/GameCover";
import GameFieldsForm from "./GameFieldsForm";
import { ArrowLeft, Check, ChevronRight, Loader2, Plus, Search } from "@/components/icons";
import { EDITABLE_FIELDS, computeFieldSources, emptyFields, type FieldSources, type GameDraft, type GameFields } from "@/lib/games/draft";
import { MAX_GAME_NAME_LENGTH } from "@/lib/games/options";
import type { LookupResult } from "@/lib/games/service";

type Step =
  | { kind: "search" }
  | { kind: "loading"; appId: number; name: string }
  | { kind: "exists"; slug: string; name: string }
  | { kind: "form"; steamAppId: number | null; name: string; coverUrl: string | null; description: string | null; sources: FieldSources; steamError?: boolean };

function pickFields(d: GameDraft): GameFields {
  return Object.fromEntries(EDITABLE_FIELDS.map(f => [f, d[f]])) as unknown as GameFields;
}

const EMPTY_LOOKUP: LookupResult = { local: [], steam: [], steamError: false };

/**
 * "Spiel hinzufügen" in drei Schritten: Namen tippen → Treffer antippen → vorausgefülltes Formular
 * kurz prüfen. Alles, was Steam weiß, ist schon ausgefüllt; Pflicht ist nur der Name.
 */
export default function AddGameModal({ open, onClose, initialQuery = "" }: { open: boolean; onClose: () => void; initialQuery?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>({ kind: "search" });
  const [query, setQuery] = useState(initialQuery);
  const [lookup, setLookup] = useState<{ q: string; result: LookupResult } | null>(null);
  const [fields, setFields] = useState<GameFields>(emptyFields());
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Beim Öffnen zurücksetzen (Name aus der Listensuche übernehmen)
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setStep({ kind: "search" });
      setQuery(initialQuery);
      setFields(emptyFields());
    }
  }

  const trimmed = query.trim();
  useEffect(() => {
    if (!open || step.kind !== "search" || trimmed.length < 2) return;
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`/api/games/lookup?q=${encodeURIComponent(trimmed)}`)
        .then(r => (r.ok ? r.json() : EMPTY_LOOKUP))
        .then((result: LookupResult) => { if (!cancelled) setLookup({ q: trimmed, result }); })
        .catch(() => { if (!cancelled) setLookup({ q: trimmed, result: { ...EMPTY_LOOKUP, steamError: true } }); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, step.kind, trimmed]);

  const searching = trimmed.length >= 2 && lookup?.q !== trimmed;
  const result = trimmed.length >= 2 && lookup?.q === trimmed ? lookup.result : null;

  async function pickSteam(appId: number, name: string) {
    setStep({ kind: "loading", appId, name });
    try {
      const res = await fetch(`/api/games/preview?appId=${appId}&name=${encodeURIComponent(name)}`);
      const data = await res.json() as { existing?: { slug: string; name: string } | null; draft?: GameDraft | null; steamError?: boolean; error?: string };
      if (data.existing) { setStep({ kind: "exists", ...data.existing }); return; }
      if (data.draft) {
        const draftFields = pickFields(data.draft);
        setFields(draftFields);
        setStep({
          kind: "form", steamAppId: appId, name: data.draft.name, coverUrl: data.draft.coverUrl,
          description: draftFields.description, sources: computeFieldSources(draftFields, draftFields),
        });
        return;
      }
      if (data.steamError) {
        setFields(emptyFields());
        setStep({ kind: "form", steamAppId: appId, name, coverUrl: null, description: null, sources: {}, steamError: true });
        return;
      }
      toast.error(data.error ?? "Spiel konnte nicht geladen werden");
      setStep({ kind: "search" });
    } catch {
      toast.error("Spiel konnte nicht geladen werden");
      setStep({ kind: "search" });
    }
  }

  function startManual() {
    setFields(emptyFields());
    setStep({ kind: "form", steamAppId: null, name: trimmed.slice(0, MAX_GAME_NAME_LENGTH), coverUrl: null, description: null, sources: {} });
  }

  async function submit() {
    if (step.kind !== "form") return;
    if (!step.name.trim()) { toast.error("Bitte gib einen Namen an."); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ steamAppId: step.steamAppId, name: step.name, fields }),
      });
      const data = await res.json() as { slug?: string; status?: string; error?: string };
      if (res.status === 409 && data.slug) {
        toast.info(data.error ?? "Das Spiel gibt es schon.");
        onClose();
        router.push(`/spiele/${data.slug}`);
        return;
      }
      if (!res.ok || !data.slug) { toast.error(data.error ?? "Speichern fehlgeschlagen"); return; }
      toast.success(data.status === "PENDING"
        ? "Danke! Das Team schaut kurz drüber, dann erscheint das Spiel in der Liste."
        : "Danke! Das Spiel ist jetzt in der Spieleliste.");
      onClose();
      router.push(`/spiele/${data.slug}`);
      router.refresh();
    } catch {
      toast.error("Speichern fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  const back = () => setStep({ kind: "search" });

  return (
    <Modal open={open} onClose={onClose} title="Spiel hinzufügen" size="lg">
      {step.kind === "search" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Spielname, z.B. Rocket League"
              aria-label="Spielname"
              maxLength={MAX_GAME_NAME_LENGTH}
              className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40"
            />
            {searching && <Loader2 className="w-4 h-4 text-gray-500 absolute right-3 top-1/2 -translate-y-1/2 animate-spin" />}
          </div>

          {trimmed.length < 2 && (
            <p className="text-xs text-gray-500">
              Tippe den Namen ein und wähle das Spiel aus. Was Steam über das Spiel weiß, füllen wir automatisch aus.
            </p>
          )}

          {result && result.local.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Schon in der Spieleliste</p>
              {result.local.map(g => (
                <Link key={g.slug} href={`/spiele/${g.slug}`} onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 bg-teal-500/[0.06] border border-teal-500/20 hover:bg-teal-500/10 transition-colors">
                  <GameCover game={g.name} coverUrl={g.coverUrl} className="w-14 h-8" rounded="rounded-md" fallbackVariant="plain" />
                  <span className="flex-1 min-w-0 text-sm text-white truncate">{g.name}</span>
                  <span className="text-[11px] text-teal-300 shrink-0">{g.status === "PENDING" ? "Wartet auf Freischaltung" : "Ansehen"}</span>
                  <ChevronRight className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}

          {result && result.steam.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Bei Steam gefunden</p>
              {result.steam.map(s => s.existingSlug ? (
                <Link key={s.appId} href={`/spiele/${s.existingSlug}`} onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-2.5 py-2 border border-white/[0.06] opacity-70 hover:opacity-100 transition-opacity">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumbUrl} alt="" className="w-14 h-8 rounded-md object-cover shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-gray-300 truncate">{s.name}</span>
                  <span className="text-[11px] text-gray-500 flex items-center gap-1 shrink-0"><Check className="w-3 h-3" /> Schon drin</span>
                </Link>
              ) : (
                <button key={s.appId} type="button" onClick={() => pickSteam(s.appId, s.name)}
                  className="w-full text-left flex items-center gap-3 rounded-xl px-2.5 py-2 border border-white/[0.06] hover:border-teal-500/40 hover:bg-teal-500/10 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.thumbUrl} alt="" className="w-14 h-8 rounded-md object-cover shrink-0" />
                  <span className="flex-1 min-w-0 text-sm text-white truncate">{s.name}</span>
                  <Plus className="w-4 h-4 text-teal-400 shrink-0" />
                </button>
              ))}
            </div>
          )}

          {result && result.steamError && (
            <p className="text-xs text-amber-300/90">Steam ist gerade nicht erreichbar — du kannst das Spiel trotzdem von Hand eintragen.</p>
          )}

          {result && (
            <button type="button" onClick={startManual}
              className="w-full text-left rounded-xl px-3 py-2.5 border border-dashed border-white/10 hover:border-white/25 text-sm text-gray-400 hover:text-white transition-colors">
              {result.steam.length === 0 && result.local.length === 0 && !result.steamError && <span className="block text-xs text-gray-500 mb-0.5">Nichts gefunden.</span>}
              „{trimmed}“ ohne Steam eintragen <span className="text-gray-600">(z.B. Konsolen-, Handy- oder Brettspiele)</span>
            </button>
          )}
        </div>
      )}

      {step.kind === "loading" && (
        <div className="flex flex-col items-center gap-3 py-10 text-sm text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          Hole Infos zu „{step.name}“ von Steam …
        </div>
      )}

      {step.kind === "exists" && (
        <div className="space-y-4 py-4 text-center">
          <p className="text-sm text-gray-300">„{step.name}“ ist schon in der Spieleliste.</p>
          <div className="flex justify-center gap-2">
            <Button variant="ghost" onClick={back} icon={<ArrowLeft className="w-4 h-4" />}>Zurück</Button>
            <Link href={`/spiele/${step.slug}`} onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold bg-teal-600 hover:bg-teal-500 text-white transition-colors">
              Zum Spiel <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {step.kind === "form" && (
        <div className="space-y-5">
          <div className="flex items-start gap-3">
            <GameCover game={step.name} coverUrl={step.coverUrl} className="w-28 h-16" rounded="rounded-lg" fallbackVariant="plain" />
            <div className="flex-1 min-w-0">
              {step.steamAppId ? (
                <p className="font-semibold text-white leading-tight">{step.name}</p>
              ) : (
                <input
                  value={step.name}
                  onChange={e => setStep({ ...step, name: e.target.value.slice(0, MAX_GAME_NAME_LENGTH) })}
                  aria-label="Spielname"
                  placeholder="Spielname"
                  className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-teal-500/40"
                />
              )}
              {step.description && <p className="text-xs text-gray-400 mt-1 line-clamp-3">{step.description}</p>}
              {step.steamAppId && !step.steamError && (
                <p className="text-[11px] text-sky-300/80 mt-1.5">Vorausgefüllt mit Steam-Daten — bitte nur kurz prüfen und ergänzen.</p>
              )}
              {step.steamError && (
                <p className="text-[11px] text-amber-300/90 mt-1.5">Steam ist gerade nicht erreichbar. Cover und Beschreibung holt das Team später nach.</p>
              )}
              {!step.steamAppId && (
                <p className="text-[11px] text-gray-500 mt-1.5">Ohne Steam-Treffer schaut das Team kurz drüber, bevor das Spiel erscheint.</p>
              )}
            </div>
          </div>

          <GameFieldsForm value={fields} onChange={setFields} sources={step.sources} showDescription={!step.steamAppId} />

          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={back} icon={<ArrowLeft className="w-4 h-4" />}>Zurück</Button>
            <Button onClick={submit} loading={saving} disabled={!step.name.trim()} icon={<Plus className="w-4 h-4" />}>Hinzufügen</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
