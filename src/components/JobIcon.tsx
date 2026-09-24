import { JOB_ICONS } from "@/lib/job-icons";

/** Berufs-Icon (einfarbige Glyphe, Farbe je Beruf). Unbekannte Schlüssel: nichts. */
export default function JobIcon({ jobKey, className = "w-4 h-4" }: { jobKey: string | null | undefined; className?: string }) {
  const cfg = jobKey ? JOB_ICONS[jobKey] : undefined;
  if (!cfg) return null;
  const src = `url(/icons/ui/${cfg.file}.png)`;
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
      style={{
        backgroundColor: cfg.color,
        WebkitMaskImage: src, maskImage: src,
        WebkitMaskSize: "contain", maskSize: "contain",
        WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat",
        WebkitMaskPosition: "center", maskPosition: "center",
      }}
    />
  );
}
