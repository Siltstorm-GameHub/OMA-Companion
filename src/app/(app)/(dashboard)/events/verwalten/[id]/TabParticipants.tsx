"use client";
import { Loader2, Search, UserMinus, UserPlus, X } from "@/components/icons";
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
export default function TabParticipants({ ctx }: { ctx: EventEdit }) {
  const {
    event, loading, checkInEnabled, checkedInIds, setPlayerCheckIn, search, setSearch, bulkSelected, setBulkSelected,
    bulkSelectedSpectators, setBulkSelectedSpectators, pasteImportOpen, setPasteImportOpen, pasteImportText, setPasteImportText,
    pasteImportResult, registeredIds, spectatorIds, userName, filteredUsers, removeUser, addSingleUser, applyPasteImport,
    bulkAdd, bulkAddSpectators, knownUsers, addableUsers, searching, searchActive, toggleSelected,
  } = ctx;
  const players = filteredUsers.filter(u => registeredIds.has(u.id));
  const spectators = filteredUsers.filter(u => spectatorIds.has(u.id));
  const nameOf = (id: string) => (knownUsers[id] ? userName(knownUsers[id]) : "?");

  return (
    <div className="space-y-4">
      <p className="text-xs text-subtle">Änderungen in diesem Reiter gelten sofort, ohne Speichern.</p>

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
      <div>
        <p className="text-xs font-semibold text-success uppercase tracking-widest mb-1.5">
          Spieler ({registeredIds.size}{event.maxPlayers ? `/${event.maxPlayers}` : ""})
        </p>
        {players.length === 0 ? (
          <p className="text-xs text-subtle px-1">{search.trim() ? "Kein angemeldeter Spieler passt zur Suche." : "Noch niemand angemeldet. Such oben nach Mitgliedern, um sie einzutragen."}</p>
        ) : (
          <div className="space-y-1">
            {players.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-3 py-2 rounded-control bg-success-soft border border-emerald-900/20">
                <Avatar u={u} name={userName(u)} tone="bg-success-soft text-success" />
                <span className="flex-1 text-sm text-success truncate font-medium">{userName(u)}</span>
                {checkInEnabled && (
                  <button type="button" onClick={() => setPlayerCheckIn(u.id, !checkedInIds.has(u.id))}
                    className={`shrink-0 text-xs font-semibold rounded-full px-2 py-0.5 border transition-colors ${
                      checkedInIds.has(u.id)
                        ? "bg-primary/15 border-primary/40 text-primary-fg"
                        : "border-gray-700 text-subtle hover:text-fg/90"
                    }`}
                    title={checkedInIds.has(u.id) ? "Auschecken" : "Manuell einchecken"}>
                    {checkedInIds.has(u.id) ? "✓ eingecheckt" : "nicht eingecheckt"}
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
      </div>

      {/* Angemeldete Zuschauer */}
      {ctx.spectatorMode && (
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
