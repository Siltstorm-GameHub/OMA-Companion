"use client";
import { useRef } from "react";

/**
 * Clip mit Schnitt-Bereich: spielt nur von `clipStart` bis `clipEnd` (Datei bleibt unverändert) und zeigt das
 * gewählte Vorschaubild. Media-Fragment (#t=) setzt den Start, timeupdate hält am Ende an bzw. springt zurück.
 */
export default function TrimmedVideo({
  url, clipStart, clipEnd, posterUrl, className, controls = true, muted, preload = "metadata",
}: {
  url: string; clipStart?: number | null; clipEnd?: number | null; posterUrl?: string | null;
  className?: string; controls?: boolean; muted?: boolean; preload?: "none" | "metadata" | "auto";
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const start = clipStart ?? 0;
  const hasTrim = clipStart != null || clipEnd != null;
  const src = hasTrim ? `${url}#t=${start}${clipEnd != null ? `,${clipEnd}` : ""}` : url;

  return (
    <video
      ref={ref}
      src={src}
      poster={posterUrl ?? undefined}
      controls={controls}
      muted={muted}
      playsInline
      preload={preload}
      className={className}
      onTimeUpdate={() => {
        const v = ref.current;
        if (!v || !hasTrim) return;
        if (clipEnd != null && v.currentTime >= clipEnd) { v.pause(); v.currentTime = start; }
        else if (v.currentTime < start - 0.25) v.currentTime = start;
      }}
      onPlay={() => {
        const v = ref.current;
        if (v && hasTrim && (v.currentTime < start || (clipEnd != null && v.currentTime >= clipEnd))) v.currentTime = start;
      }}
    />
  );
}
