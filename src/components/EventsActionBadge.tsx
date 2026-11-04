"use client";
import { usePolledCount } from "@/lib/usePolledCount";

export default function EventsActionBadge() {
  const count = usePolledCount("/api/admin/events/action-count");

  if (count === 0) return null;

  return (
    <span
      style={{
        position: "absolute",
        top: -2,
        right: -2,
        minWidth: 14,
        height: 14,
        borderRadius: 7,
        background: "#f59e0b",
        color: "#000",
        fontSize: 9,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 3px",
        boxShadow: "0 0 0 2px rgba(13,13,15,0.9)",
        lineHeight: 1,
        pointerEvents: "none",
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
