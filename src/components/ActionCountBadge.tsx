// Rein visuelles Pendant zu EventsActionBadge/ServerApplicationBadge (kein eigener Fetch) —
// für Stellen, an denen die Zahl bereits vom Server mitgeliefert wurde (z.B. pro Event/Eventreihe).
export default function ActionCountBadge({ count, title }: { count: number; title?: string }) {
  if (count <= 0) return null;

  return (
    <span
      title={title}
      style={{
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        background: "#f59e0b",
        color: "#000",
        fontSize: 10,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 4px",
        lineHeight: 1,
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
