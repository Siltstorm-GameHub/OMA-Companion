"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, X, Check, Plus, Loader2, Gamepad2 } from "lucide-react";
import GameCover from "@/components/GameCover";
import PollGameSuggestInput from "@/components/PollGameSuggestInput";
import { MAX_FAVORITE_GAMES, steamCoverUrl, type FavoriteGame } from "@/lib/favorite-games";

interface Props {
  games: FavoriteGame[];
  /** Fremdes Profil → nur Anzeige, kein Bearbeiten */
  readOnly?: boolean;
  /** Anzeigename für die Leer-Meldung auf fremden Profilen */
  displayName?: string;
}

export default function FavoriteGamesSection({ games, readOnly = false, displayName }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState<FavoriteGame[]>(games);
  const [saving,  setSaving]  = useState(false);

  const displayGames = editing ? draft : games;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/favorite-games", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ games: draft }),
      });
      if (res.ok) {
        toast.success("Lieblingsspiele gespeichert");
        setEditing(false);
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Fehler beim Speichern");
      }
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setDraft(games);
    setEditing(false);
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
          <Gamepad2 className="w-3.5 h-3.5" /> Zockt gerade
          <span className="text-gray-600 normal-case tracking-normal">
            ({displayGames.length}/{MAX_FAVORITE_GAMES})
          </span>
        </h2>

        {!readOnly && (editing ? (
          <div className="flex items-center gap-2">
            <button onClick={cancel}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white transition-colors">
              <X className="w-3 h-3" /> Abbrechen
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1 text-[10px] px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Speichern
            </button>
          </div>
        ) : (
          <button onClick={() => { setDraft(games); setEditing(true); }}
            className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.1] text-gray-500 hover:text-white hover:border-white/[0.2] transition-colors">
            <Pencil className="w-3 h-3" /> Bearbeiten
          </button>
        ))}
      </div>

      <div className="glass card-shine rounded-2xl p-4 space-y-4">
        {displayGames.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 text-sm font-medium">
              {readOnly
                ? `${displayName ?? "Dieser User"} hat noch keine Lieblingsspiele hinterlegt`
                : "Noch keine Lieblingsspiele hinterlegt"}
            </p>
            {!readOnly && !editing && (
              <p className="text-xs text-gray-600 mt-1">
                Trag bis zu {MAX_FAVORITE_GAMES} Spiele ein, die du gerade am häufigsten zockst
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {displayGames.map((g, i) => (
              <div key={`${g.name}-${i}`}
                className="relative rounded-xl overflow-hidden border border-white/[0.08] bg-white/[0.02] group">
                <GameCover
                  game={g.name}
                  coverUrl={g.appId ? steamCoverUrl(g.appId) : null}
                  className="w-full aspect-[16/9]"
                  rounded="rounded-none"
                  imgClassName="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 px-2 pt-6 pb-1.5 pointer-events-none"
                  style={{ background: "linear-gradient(to top, rgba(0,0,0,0.88), transparent)" }}>
                  <p className="text-[11px] font-medium text-white truncate">{g.name}</p>
                </div>
                {editing && (
                  <button
                    onClick={() => setDraft(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/85 border border-red-400/40 flex items-center justify-center hover:bg-red-500 transition-colors"
                    title={`${g.name} entfernen`}
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                )}
              </div>
            ))}

            {/* Leere Slots nur während des Bearbeitens */}
            {editing && Array.from({ length: MAX_FAVORITE_GAMES - displayGames.length }).map((_, i) => (
              <div key={`empty-${i}`}
                className="rounded-xl border border-dashed border-white/[0.1] bg-white/[0.01] aspect-[16/9] flex flex-col items-center justify-center gap-1">
                <Plus className="w-4 h-4 text-gray-700" />
                <span className="text-[9px] text-gray-700">Leer</span>
              </div>
            ))}
          </div>
        )}

        {/* Steam-Suche (nur beim Bearbeiten) */}
        {editing && (
          <div className="pt-3 border-t border-white/[0.06]">
            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest mb-2">
              Spiel hinzufügen
            </p>
            <PollGameSuggestInput
              value={draft}
              onChange={next => setDraft(next.map(g => ({ name: g.name, appId: g.appId })))}
              max={MAX_FAVORITE_GAMES}
              hideChips
            />
            <p className="text-[10px] text-gray-600 mt-2">
              Die Cover kommen aus der Steam-Datenbank — wähl einen Treffer aus der Liste, damit das passende Bild geladen wird.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
