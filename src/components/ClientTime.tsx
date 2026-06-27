"use client";
import { useState, useEffect } from "react";

/**
 * Renders a time string client-side to guarantee correct timezone handling
 * regardless of the server's ICU configuration.
 * Falls back to `serverDisplay` during SSR to avoid empty flash.
 */
export default function ClientTime({
  iso,
  serverDisplay,
}: {
  iso: string;
  serverDisplay: string;
}) {
  const [display, setDisplay] = useState(serverDisplay);

  useEffect(() => {
    setDisplay(
      new Date(iso).toLocaleString("de-DE", {
        timeZone: "Europe/Berlin",
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  }, [iso]);

  return <span suppressHydrationWarning>{display}</span>;
}
