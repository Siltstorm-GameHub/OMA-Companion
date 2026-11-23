"use client";
import { HUB_POLLS_EVENT, readHubPolls } from "@/lib/hub-events";
import { useHubValue } from "@/lib/useHubValue";

/** Zahl offener Umfragen ohne eigene Stimme — kommt aus dem gemeinsamen Hub-Abruf (/api/me/pulse). */
export default function PollBadge() {
  const count = useHubValue(HUB_POLLS_EVENT, readHubPolls, 0);

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
        boxShadow: "0 0 0 2px var(--color-surface)",
        lineHeight: 1,
        pointerEvents: "none",
      }}
    >
      {count > 9 ? "9+" : count}
    </span>
  );
}
