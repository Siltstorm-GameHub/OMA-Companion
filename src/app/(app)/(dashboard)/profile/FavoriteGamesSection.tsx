"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Check, Plus, Loader2, Gamepad2, Search } from "@/components/icons";
import GameCover from "@/components/GameCover";
import PollGameSuggestInput from "@/components/PollGameSuggestInput";
import { MAX_FAVORITE_GAMES, steamCoverUrl, type FavoriteGame } from "@/lib/favorite-games";
import type { ProfileGameRef } from "@/lib/profile-data";

interface Props {
  /** Gespeicherte Auswahl (Name + Steam-ID) — Grundlage fürs Bearbeiten */
  games: FavoriteGame[];
  /** Dieselbe Auswahl, aufgelöst gegen die Spieleliste (Link + Cover) — für die Anzeige */
  current: ProfileGameRef[];
  /** Schnellauswahl beim Bearbeiten: deine GameSwipe-"Am Start"-Spiele */
  quickPicks?: ProfileGameRef[];
  /** Fremdes Profil → nur Anzeige, kein Bearbeiten */
  readOnly?: boolean;
  displayName?: string;
}

type Suggestion = { name: string; coverUrl: string | null };

const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * "Zockt gerade": bis zu 5 selbst gewählte Spiele, an denen jemand gerade sitzt. Gewählt wird aus der
 * Spieleliste (Schnellauswahl = eigene GameSwipe-"Am Start"-Spiele, dazu Suche); nur für Spiele, die
 * noch nicht in der Liste stehen, gibt es die Steam-Suche. Gespeichert wird wie bisher Name + Steam-ID
 * (favoriteGamesJson) — die Zuordnung zur Spieleliste passiert beim Anzeigen (lib/profile-data.ts).
 */
export default function FavoriteGamesSection({ games, current, quickPicks = [], readOnly = false, displayName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<FavoriteGame[]>(games);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [steamOpen, setSteamOpen] = useState(false);

  // Erlaubt der "Profil vervollständigen"-Checkliste, diese Sektion von außen zu öffnen.
  useEffect(() => {
    if (readOnly) return;
    const handler = () => { setDraft(games); setEditing(true); };
    window.addEventListener("profile-open-favorite-games", handler);
    return () => window.removeEventListener("profile-open-favorite-games", handler);
  }, [readOnly, games]);

  // Suche in der Spieleliste (leicht verzögert)
  useEffect(() => {
    if (!editing) return;
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      fetch(`/api/games/suggest?q=${encodeURIComponent(q)}`)
        .then(r => (r.ok ? r.json() : []))
        .then((rows: Suggestion[]) => setSuggestions(Array.isArray(rows) ? rows : []))
        .catch(() => setSuggestions([]));
    }, 200);
    return () => clearTimeout(t);
  }, [query, editing]);

  // Treffer nur zeigen, solange eine Suche läuft (kein setState im Effect nötig)
  const shownSuggestions = query.trim().length >= 2 ? suggestions : [];
  const full = draft.length >= MAX_FAVORITE_GAMES;
  const inDraft = (name: string) => draft.some(g => sameName(g.name, name));
  function add(game: FavoriteGame) {
    if (full || inDraft(game.name)) return;
    setDraft(prev => [...prev, game]);
    setQuery("");
    setSuggestions([]);
  }

  // Cover für die Bearbeiten-Ansicht: aus Anzeige, Schnellauswahl oder Suche, sonst Steam
  const coverFor = (g: FavoriteGame) =>
    current.find(c => sameName(c.name, g.name))?.coverUrl
    ?? quickPicks.find(c => sameName(c.name, g.name))?.coverUrl
    ?? shownSuggestions.find(c => sameName(c.name, g.name))?.coverUrl
    ?? (g.appId ? steamCoverUrl(g.appId) : null);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/favorite-games", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ games: draft }),
      });
      if (res.ok) {
        toast.success("Gespeichert");
        setEditing(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Speichern hat nicht geklappt");
      }
    } catch {
      toast.error("Keine Verbindung");
    } finally {
      setSaving(false);
    }
  }

  const tiles: { key: string; name: string; cover: string | null; slug: string | null; index: number }[] = editing
    ? draft.map((g, index) => ({ key: `${g.name}-${index}`, name: g.name, cover: coverFor(g), slug: null, index }))
    : current.map((g, index) => ({ key: `${g.name}-${index}`, name: g.name, cover: g.coverUrl, slug: g.slug, index }));

  return (
    <section id="favorite-games-section" className="scroll-mt-24">
      <div className="flex items-center justify-between mb-2.5">
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5 text-teal-500/70" /> Zockt gerade
        </h2>
        {!readOnly && (editing ? (
          <div className="flex items-center gap-2">
            <button onClick={() => { setDraft(games); setEditing(false); setSteamOpen(false); }}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.08] text-gray-400 hover:text-white transition-colors">
              <X className="w-3 h-3" /> Abbrechen
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-teal-950 font-semibold transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Speichern
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(games); setEditing(true); }}
            className="flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-white/[0.1] text-gray-400 hover:text-white hover:border-white/[0.2] transition-colors">
            <Pencil className="w-3 h-3" /> Ändern
          </button>
        ))}
      </div>

      <div className="glass rounded-2xl p-3 sm:p-4 space-y-4">
        {tiles.length === 0 && !editing ? (
          <p className="text-sm text-gray-500 text-center py-4">
            {readOnly
              ? `${displayName ?? "Dieses Mitglied"} hat noch nicht eingetragen, was gerade läuft.`
              : `Was zockst du gerade? Wähl bis zu ${MAX_FAVORITE_GAMES} Spiele.`}
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {tiles.map(t => {
              const cover = (
                <>
                  <GameCover game={t.name} coverUrl={t.cover} className="w-full aspect-[16/9]" rounded="rounded-none"
                    imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" fallbackVariant="plain" />
                  <div className="absolute inset-x-0 bottom-0 px-2 pt-6 pb-1.5 pointer-events-none"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88), transparent)" }}>
                    <p className="text-[11px] font-medium text-white truncate">{t.name}</p>
                  </div>
                </>
              );
              const cls = "relative block rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02] group";
              if (editing) {
                return (
                  <div key={t.key} className={cls}>
                    {cover}
                    <button onClick={() => setDraft(prev => prev.filter((_, i) => i !== t.index))}
                      className="absolute top-1.5 right-1.5 z-20 w-5 h-5 rounded-full bg-red-500/85 flex items-center justify-center hover:bg-red-500"
                      aria-label={`${t.name} entfernen`}>
                      <X className="w-3 h-3 text-white" />
                    </button>
                  </div>
                );
              }
              return t.slug
                ? <Link key={t.key} href={`/spiele/${t.slug}`} className={`${cls} hover:border-teal-400/40`} title={`${t.name}: wer spielt es noch?`}>{cover}</Link>
                : <div key={t.key} className={cls}>{cover}</div>;
            })}
            {editing && Array.from({ length: MAX_FAVORITE_GAMES - draft.length }).map((_, i) => (
              <div key={`empty-${i}`} className="rounded-xl border border-dashed border-white/[0.1] aspect-[16/9] flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-700" />
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="pt-3 border-t border-white/[0.06] space-y-3">
            {quickPicks.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-gray-500 mb-1.5">Aus deinen „Am Start“-Spielen</p>
                <div className="flex flex-wrap gap-1.5">
                  {quickPicks.slice(0, 16).map(g => {
                    const picked = inDraft(g.name);
                    return (
                      <button key={g.name} type="button" disabled={picked || full}
                        onClick={() => add({ name: g.name, appId: g.appId })}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-colors ${
                          picked ? "border-teal-400/50 bg-teal-500/15 text-teal-300" : "border-white/[0.1] text-gray-300 hover:border-white/[0.25] disabled:opacity-40"
                        }`}>
                        {picked ? "✓ " : "+ "}{g.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div>
              <p className="text-[11px] font-semibold text-gray-500 mb-1.5">In der Spieleliste suchen</p>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                <input value={query} onChange={e => setQuery(e.target.value)} disabled={full}
                  placeholder={full ? `Maximal ${MAX_FAVORITE_GAMES} Spiele` : "z.B. Rocket League"}
                  aria-label="Spiel suchen"
                  className="w-full rounded-lg bg-white/[0.04] border border-white/[0.08] pl-8 pr-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-400/50 disabled:opacity-50" />
              </div>
              {shownSuggestions.length > 0 && (
                <div className="mt-1.5 rounded-lg border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
                  {shownSuggestions.map(s => (
                    <button key={s.name} type="button" disabled={inDraft(s.name)} onClick={() => add({ name: s.name, appId: null })}
                      className="w-full flex items-center gap-2.5 px-2.5 py-1.5 text-left hover:bg-white/[0.04] disabled:opacity-40">
                      <GameCover game={s.name} coverUrl={s.coverUrl} className="w-12 h-7 shrink-0" rounded="rounded" fallbackVariant="plain" />
                      <span className="text-sm text-gray-200 truncate">{s.name}</span>
                      {inDraft(s.name) && <Check className="w-3.5 h-3.5 text-teal-400 ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
              {query.trim().length >= 2 && shownSuggestions.length === 0 && (
                <p className="text-[11px] text-gray-600 mt-1.5">Nichts in der Spieleliste gefunden.</p>
              )}
            </div>

            <div>
              <button type="button" onClick={() => setSteamOpen(o => !o)} className="text-[11px] text-teal-400 hover:text-teal-300">
                {steamOpen ? "Steam-Suche schließen" : "Spiel nicht in der Liste? Auf Steam suchen"}
              </button>
              {steamOpen && (
                <div className="mt-2">
                  <PollGameSuggestInput
                    value={draft}
                    onChange={next => setDraft(next.map(g => ({ name: g.name, appId: g.appId })))}
                    max={MAX_FAVORITE_GAMES}
                    hideChips
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
