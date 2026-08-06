/**
 * Wird Link-Vorschau-Bots (Discord, Slack, Telegram, ...) gezeigt, die ohne
 * Session eine Seite mit eigener generateMetadata() aufrufen — siehe
 * (dashboard)/layout.tsx und lib/link-preview-bots.ts.
 *
 * Diese Bots lesen nur die Meta-Tags im <head>, nicht den sichtbaren Inhalt.
 * Läuft eine Seite hier ein statt ihrer echten Daten anzuzeigen, spart das
 * unnötige DB-Last pro Linkvorschau — und verhindert, dass Seiten, die von
 * einer echten Session ausgehen (session.user.id o.ä.), für einen anonymen
 * Aufruf abstürzen.
 */
export default function BotPreviewShell() {
  return (
    <div
      style={{
        minHeight: "50vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#94a3b8",
        fontFamily: "sans-serif",
        fontSize: 14,
      }}
    >
      Old Masters Ally
    </div>
  );
}
