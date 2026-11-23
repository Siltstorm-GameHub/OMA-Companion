"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Copy, Loader2, Search, UserMinus, UserPlus, X } from "@/components/icons";
import type { User } from "./edit-shared";
import type { EventEdit } from "./useEventEdit";

function Avatar({ u, name, tone }: { u: User; name: string; tone: string }) {
  return u.image
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={u.image} alt="" className="w-7 h-7 rounded-full shrink-0 object-cover" />
    : <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${tone}`}>{name[0]?.toUpperCase()}</div>;
}

/**
 * Reiter "Teilnehmer": Spieler und Zuschauer eintragen und entfernen. Änderungen hier wirken sofort
 * (keine Speicherleiste). Neue Teilnehmer findet die Mitglieder-Suche (ab 2 Zeichen) oder "Liste einfügen".
 */
type Filter = "all" | "ready" | "notReady" | "spectators" | "waitlist";

export default function TabParticipants({ ctx, waitlist = [] }: { ctx: EventEdit; waitlist?: { id: string; name: string }[] }) {
  // (8) Filter-Chips und "Nicht Bereite kopieren"
  const [filter, setFilter] = useState<Filter>("all");
  const {
    event, loading, checkInEnabled, checkedInIds, setPlayerCheckIn, search, setSearch, bulkSelected, setBulkSelected,
    bulkSelectedSpectators, setBulkSelectedSpectators, pasteImportOpen, setPasteImportOpen, pasteImportText, setPasteImportText,
    pasteImportResult, registeredIds, spectatorIds, userName, filteredUsers, removeUser, addSingleUser, applyPasteImport,
    bulkAdd, bulkAddSpectators, knownUsers, addableUsers, searching, searchActive, toggleSelected,
  } = ctx;
  const allPlayers = filteredUsers.filter(u => registeredIds.has(u.id));
  const players = filter === "ready" ? allPlayers.filter(u => checkedInIds.has(u.id))
    : filter === "notReady" ? allPlayers.filter(u => !checkedInIds.has(u.id))
      : filter === "all" ? allPlayers : [];
  const spectators = filter === "all" || filter === "spectators" ? filteredUsers.filter(u => spectatorIds.has(u.id)) : [];
  const notReadyNames = allPlayers.filter(u => !checkedInIds.has(u.id)).map(u => `@${userName(u)}`);
  async function copyNotReady() {
    const text = notReadyNames.join(" ");
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${notReadyNames.length} Namen kopiert`, { description: "Zum Erinnern im Discord einfügen." });
    } catch {
      toast.error("Kopieren hat nicht geklappt");
    }
  }
  const readyCount = allPlayers.filter(u => checkedInIds.has(u.id)).length;
  const chips: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Alle", count: registeredIds.size + spectatorIds.size },
    ...(checkInEnabled ? [
      { key: "ready" as const, label: "Bereit", count: readyCount },
      { key: "notReady" as const, label: "Nicht bereit", count: registeredIds.size - readyCount },
    ] : []),
    ...(ctx.spectatorMode ? [{ key: "spectators" as const, label: "Zuschauer", count: spectatorIds.size }] : []),
    ...(waitlist.length > 0 ? [{ key: "waitlist" as const, label: "Warteliste", count: waitlist.length }] : []),
  ];
  const nameOf = (id: string) => (knownUsers[id] ? userName(knownUsers[id]) : "?");

  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">Änderungen in diesem Reiter gelten sofort, ohne Speichern.</p>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-1.5">
        {chips.map(c => (
          <button key={c.key} type="button" onClick={() => setFilter(c.key)} aria-pressed={filter === c.key}
            className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-sm font-semibold transition-colors ${
              filter === c.key ? "border-primary/40 bg-primary-soft text-primary-fg" : "border-line bg-surface text-muted hover:text-fg"
            }`}>
            {c.label} <span className="text-xs tabular-nums opacity-80">{c.count}</span>
          </button>
        ))}
        {checkInEnabled && notReadyNames.length > 0 && (
          <button type="button" onClick={copyNotReady}
            className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-control border border-line-strong bg-surface-2 px-3 text-sm font-semibold text-fg hover:bg-surface-3"
            title="Kopiert die @-Namen aller, die noch nicht bereit sind — zum Erinnern im Discord">
            <Copy className="size-4" /> Nicht Bereite kopieren
          </button>
        )}
      </div>

      {/* Warteliste (nur ansehen — wer nachrückt, regelt die App automatisch) */}
      {filter === "waitlist" && (
        <ol className="space-y-1">
          {waitlist.map((w, i) => (
            <li key={w.id} className="flex items-center gap-3 rounded-control border border-line bg-surface-2 px-3 py-2">
              <span className="w-5 text-center text-xs font-bold text-subtle tabular-nums">{i + 1}</span>
              <span className="flex-1 truncate text-sm font-semibold text-fg">{w.name}</span>
              {i === 0 && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary-fg">rückt als Nächstes nach</span>}
            </li>
          ))}
        </ol>
      )}

      {/* Suche: filtert die Angemeldeten und findet weitere Mitglieder */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
          <input type="search" placeholder="Mitglied suchen (Name oder Username)…" value={search}
            onChange={e => setSearch(e.target.value)} aria-label="Mitglied suchen"
            className="w-full text-sm bg-surface-2 border border-line text-fg rounded-control pl-9 pr-3 py-2 placeholder:text-subtle" />
        </div>
        <button type="button" onClick={() => setPasteImportOpen(o => !o)}
          className="shrink-0 text-xs text-muted hover:text-fg border border-gray-700 rounded-control px-3 py-2 transition-colors">
          {pasteImportOpen ? "Liste schließen" : "Liste einfügen"}
        </button>
      </div>

      {/* Namen-Liste einfügen (z.B. aus Discord kopiert) statt einzeln zu suchen */}
      {pasteImportOpen && (
        <div className="rounded-control border border-line bg-surface-2 p-3 space-y-2">
          <p className="text-xs text-subtle">
            Namen oder Usernamen einfügen, getrennt durch Zeilenumbruch oder Komma. Gefundene Mitglieder werden als Spieler ausgewählt.
          </p>
          <textarea value={pasteImportText} onChange={e => setPasteImportText(e.target.value)}
            rows={3} placeholder={"z.B.\nMaxMustermann\nErikaM"}
            className="w-full text-sm bg-surface-2 border border-line text-fg rounded-control px-3 py-2 placeholder:text-subtle resize-none" />
          <div className="flex items-center gap-2 flex-wrap">
            <button type="button" onClick={applyPasteImport} disabled={!pasteImportText.trim()}
              className="text-xs bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-ink rounded-control px-3 py-1.5 transition-colors">
              Abgleichen und auswählen
            </button>
            {pasteImportResult && (
              <span className="text-xs text-subtle">
                {pasteImportResult.matched} gefunden
                {pasteImportResult.unmatched.length > 0 && `, nicht gefunden: ${pasteImportResult.unmatched.join(", ")}`}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Auswahl, die noch hinzugefügt werden muss */}
      {(bulkSelected.length > 0 || bulkSelectedSpectators.length > 0) && (
        <div className="rounded-control border border-primary/30 bg-primary-soft p-3 space-y-2">
          {bulkSelected.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted">Als Spieler:</span>
              {bulkSelected.map(id => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-line px-2 py-0.5 text-xs text-fg">
                  {nameOf(id)}
                  <button type="button" aria-label={`${nameOf(id)} abwählen`} onClick={() => setBulkSelected(prev => prev.filter(x => x !== id))}>
                    <X className="w-3 h-3 text-subtle hover:text-fg" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={bulkAdd} disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-ink rounded-control px-3 py-1.5 transition-colors disabled:opacity-50 max-lg:min-h-10">
                <UserPlus className="w-3.5 h-3.5" /> {bulkSelected.length} hinzufügen
              </button>
            </div>
          )}
          {bulkSelectedSpectators.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted">Als Zuschauer:</span>
              {bulkSelectedSpectators.map(id => (
                <span key={id} className="inline-flex items-center gap-1 rounded-full bg-line px-2 py-0.5 text-xs text-fg">
                  {nameOf(id)}
                  <button type="button" aria-label={`${nameOf(id)} abwählen`} onClick={() => setBulkSelectedSpectators(prev => prev.filter(x => x !== id))}>
                    <X className="w-3 h-3 text-subtle hover:text-fg" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={bulkAddSpectators} disabled={loading}
                className="ml-auto flex items-center gap-1.5 text-xs bg-primary hover:bg-primary-hover text-primary-ink rounded-control px-3 py-1.5 transition-colors disabled:opacity-50 max-lg:min-h-10">
                <UserPlus className="w-3.5 h-3.5" /> {bulkSelectedSpectators.length} hinzufügen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Suchergebnis: noch nicht angemeldete Mitglieder */}
      {searchActive && (
        <div>
          <p className="text-xs font-semibold text-subtle uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
            Nicht angemeldet {searching && <Loader2 className="w-3 h-3 animate-spin" />}
          </p>
          {!searching && addableUsers.length === 0 ? (
            <p className="text-xs text-subtle px-1">Kein weiteres Mitglied gefunden.</p>
          ) : (
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {addableUsers.map(u => {
                const asPlayer = bulkSelected.includes(u.id);
                const asSpectator = bulkSelectedSpectators.includes(u.id);
                return (
                  <div key={u.id} className={`flex items-center gap-3 px-3 py-2 rounded-control transition-colors ${
                    asPlayer || asSpectator ? "bg-primary-soft border border-primary/30" : "bg-gray-800 border border-transparent"
                  }`}>
                    <input type="checkbox" checked={asPlayer} aria-label={`${userName(u)} als Spieler auswählen`}
                      onChange={e => toggleSelected(u, "player", e.target.checked)}
                      className="rounded accent-primary shrink-0" />
                    <Avatar u={u} name={userName(u)} tone="bg-gray-700 text-fg/90" />
                    <span className="flex-1 text-sm text-fg truncate">{userName(u)}</span>
                    {ctx.spectatorMode && (
                      <button type="button" onClick={() => toggleSelected(u, "spectator", !asSpectator)}
                        className={`shrink-0 text-xs rounded-full px-2 py-0.5 border transition-colors ${asSpectator ? "border-primary/40 bg-primary/15 text-primary-fg" : "border-gray-700 text-subtle hover:text-fg/90"}`}>
                        👁️ Zuschauer
                      </button>
                    )}
                    <button type="button" onClick={() => addSingleUser(u.id)} disabled={loading} title="Sofort als Spieler eintragen"
                      aria-label={`${userName(u)} sofort als Spieler eintragen`}
                      className="shrink-0 text-subtle hover:text-primary p-1.5 rounded transition-colors disabled:opacity-50">
                      <UserPlus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Angemeldete Spieler */}
      {(filter === "all" || filter === "ready" || filter === "notReady") && <div>
        <p className="text-xs font-semibold text-success uppercase tracking-widest mb-1.5">
          Spieler ({registeredIds.size}{event.maxPlayers ? `/${event.maxPlayers}` : ""})
        </p>
        {players.length === 0 ? (
          <p className="text-xs text-subtle px-1">{filter === "ready" ? "Noch niemand bereit gemeldet." : filter === "notReady" ? "Alle sind bereit." : search.trim() ? "Kein angemeldeter Spieler passt zur Suche." : "Noch niemand angemeldet. Such oben nach Mitgliedern, um sie einzutragen."}</p>
        ) : (
          <div className="space-y-1">
            {players.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-control bg-surface-2 border border-line">
                <Avatar u={u} name={userName(u)} tone="bg-success-soft text-success" />
                <span className="flex-1 text-sm text-fg truncate font-semibold">{userName(u)}</span>
                {checkInEnabled && (
                  <button type="button" onClick={() => setPlayerCheckIn(u.id, !checkedInIds.has(u.id))}
                    className={`shrink-0 min-h-8 text-xs font-semibold rounded-full px-2.5 border transition-colors ${
                      checkedInIds.has(u.id)
                        ? "bg-success-soft border-success/30 text-success"
                        : "border-line-strong text-subtle hover:text-fg"
                    }`}
                    title={checkedInIds.has(u.id) ? "Auschecken" : "Manuell einchecken"}>
                    {checkedInIds.has(u.id) ? "✓ bereit" : "nicht bereit"}
                  </button>
                )}
                <button type="button" onClick={() => removeUser(u.id, userName(u))} disabled={loading} aria-label={`${userName(u)} entfernen`}
                  className="shrink-0 text-subtle hover:text-danger p-1.5 rounded transition-colors disabled:opacity-50">
                  <UserMinus className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>}

      {/* Angemeldete Zuschauer */}
      {ctx.spectatorMode && (filter === "all" || filter === "spectators") && (
        <div className="pt-2 border-t border-line">
          <p className="text-xs font-semibold text-primary/80 uppercase tracking-widest mb-1.5">
            👁️ Zuschauer ({spectatorIds.size})
          </p>
          {spectators.length === 0 ? (
            <p className="text-xs text-subtle px-1">Keine Zuschauer angemeldet.</p>
          ) : (
            <div className="space-y-1">
              {spectators.map(u => (
                <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-control bg-primary-soft border border-primary/30">
                  <Avatar u={u} name={userName(u)} tone="bg-primary-soft text-primary" />
                  <span className="flex-1 text-sm text-primary-fg/80 truncate">{userName(u)}</span>
                  <button type="button" onClick={() => removeUser(u.id, userName(u), "spectator")} disabled={loading} aria-label={`${userName(u)} entfernen`}
                    className="shrink-0 text-subtle hover:text-danger p-1.5 rounded transition-colors disabled:opacity-50">
                    <UserMinus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
