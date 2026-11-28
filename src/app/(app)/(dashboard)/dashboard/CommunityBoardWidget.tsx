"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import Link from "next/link";
import { BookOpen, CalendarDays, ImagePlus, Lightbulb, Loader2, Megaphone, Newspaper, ThumbsUp } from "@/components/icons";
import { GateLink } from "@/components/GuestGate";
import RankedAvatar from "@/components/RankedAvatar";
import { isVideoUrl } from "@/lib/upload-limits";
import { buttonClasses } from "@/components/ui/button-styles";

/**
 * "Aus der Community" auf der Übersicht: die neuesten Einträge des Community-Boards als waagerechte Reihe
 * (gleiche API wie das Board). Jede Art hat ihre Aktion direkt auf der Karte: Daumen (Beiträge, Anleitungen),
 * "Unterstützen" (Ideen), "Ich wäre dabei" (Event-Vorschläge). Die Überschrift setzt die Seite (ModuleHeader).
 * Gäste sehen eine Vorschau, was es im Board gibt, statt eines leeren Bereichs.
 */

type Kind = "report" | "asset" | "marketing_post" | "idea" | "guide" | "proposal";

interface FeedEntry {
  kind: Kind;
  id: string;
  title?: string;
  caption?: string;
  url?: string;
  author: { id: string; username: string | null; name: string | null; image: string | null };
  upvotes?: number;
  votedByMe?: boolean;
  supporters?: number;
  supportedByMe?: boolean;
  interested?: number;
  interestedByMe?: boolean;
  coverAsset?: { url: string } | null;
  gameCover?: { url: string } | null;
  imageUrl?: string | null;
  asset?: { url: string } | null;
  media?: { url: string }[];
}

const KIND_META: Record<Kind, { label: string; icon: typeof Newspaper; tone: string }> = {
  report: { label: "Beitrag", icon: Newspaper, tone: "text-primary-fg" },
  asset: { label: "Foto", icon: ImagePlus, tone: "text-violet-300" },
  marketing_post: { label: "Werbung", icon: Megaphone, tone: "text-coin" },
  idea: { label: "Idee", icon: Lightbulb, tone: "text-coin" },
  guide: { label: "Anleitung", icon: BookOpen, tone: "text-violet-300" },
  proposal: { label: "Event-Vorschlag", icon: CalendarDays, tone: "text-success" },
};

function entryHref(e: FeedEntry): string {
  if (e.kind === "report") return `/community-board/report/${e.id}`;
  if (e.kind === "idea") return `/community-board/idea/${e.id}`;
  return `/community-board#${e.kind}-${e.id}`;
}

function entryImage(e: FeedEntry): string | null {
  if (e.kind === "asset") return e.url ?? null;
  if (e.kind === "report") return e.coverAsset?.url ?? e.gameCover?.url ?? e.media?.find(m => !isVideoUrl(m.url))?.url ?? null;
  if (e.kind === "marketing_post") return e.imageUrl ?? e.asset?.url ?? null;
  return null;
}

/** Aktion je Art: [Zähler, an?, Text an, Text aus, Endpunkt + Body] */
function actionFor(e: FeedEntry) {
  switch (e.kind) {
    case "report":
    case "guide": {
      const url = e.kind === "report" ? `/api/community-jobs/reports/${e.id}/vote` : `/api/community-jobs/coach/guides/${e.id}/vote`;
      return { count: e.upvotes ?? 0, on: !!e.votedByMe, labelOn: "", labelOff: "", icon: "thumb" as const,
        send: (next: boolean) => fetch(url, { method: next ? "POST" : "DELETE" }) };
    }
    case "idea":
      return { count: e.supporters ?? 0, on: !!e.supportedByMe, labelOn: "Unterstützt", labelOff: "Unterstützen", icon: "thumb" as const,
        send: (next: boolean) => fetch(`/api/community-jobs/ideas/${e.id}/interest`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "SUPPORT", on: next }),
        }) };
    case "proposal":
      return { count: e.interested ?? 0, on: !!e.interestedByMe, labelOn: "Dabei", labelOff: "Ich wäre dabei", icon: "hand" as const,
        send: (next: boolean) => fetch(`/api/event-proposals/${e.id}/interest`, {
          method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ on: next }),
        }) };
    default:
      return null;
  }
}

function CardAction({ entry, meId }: { entry: FeedEntry; meId?: string }) {
  const a = actionFor(entry);
  const [on, setOn] = useState(a?.on ?? false);
  const [count, setCount] = useState(a?.count ?? 0);
  const [busy, setBusy] = useState(false);
  if (!a) return null;
  const own = !!meId && entry.author.id === meId;

  async function toggle() {
    if (busy || !a) return;
    const next = !on;
    setBusy(true); setOn(next); setCount(c => Math.max(0, c + (next ? 1 : -1)));
    try {
      const res = await a.send(next);
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Fehlgeschlagen");
    } catch (err) {
      setOn(!next); setCount(c => Math.max(0, c + (next ? -1 : 1)));
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally { setBusy(false); }
  }

  const label = on ? a.labelOn : a.labelOff;
  const glyph = a.icon === "hand" ? <span aria-hidden>🙋</span> : <ThumbsUp className="size-3.5" />;
  if (own) {
    return <span className="relative z-20 inline-flex items-center gap-1 text-xs text-muted">{glyph} {count}</span>;
  }
  return (
    <button type="button" onClick={toggle} disabled={busy} aria-pressed={on}
      className={`relative z-20 inline-flex min-h-9 items-center gap-1.5 self-start rounded-full border px-3 text-xs font-semibold transition-all active:scale-95 ${
        on ? "border-primary bg-primary text-primary-ink" : "border-primary/50 bg-canvas/70 text-primary-fg hover:bg-primary/20"
      }`}>
      {glyph} <span className="tabular-nums">{count}</span>{label && <span>{label}</span>}
    </button>
  );
}

export default function CommunityBoardWidget() {
  const [feed, setFeed] = useState<FeedEntry[] | null>(null);
  const { data: session, status } = useSession();
  const meId = (session?.user as { id?: string } | undefined)?.id;

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/community-board?limit=8")
      .then(r => (r.ok ? r.json() : { feed: [] }))
      .then(d => { if (!cancelled) setFeed(d.feed ?? []); })
      .catch(() => { if (!cancelled) setFeed([]); });
    return () => { cancelled = true; };
  }, [status]);

  // Gäste: was es im Board gibt — statt eines leeren Bereichs
  if (status === "unauthenticated") {
    return (
      <div className="rounded-card border border-line bg-surface p-5 shadow-card">
        <p className="text-sm font-bold text-fg">Teilen, bewerten, mitmachen</p>
        <p className="mt-1 text-sm text-muted">Im Community-Board teilen Mitglieder Fotos, Clips und Berichte, schlagen Events vor und bringen Ideen ein.</p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {(["report", "proposal", "idea", "guide"] as const).map(k => {
            const m = KIND_META[k];
            return (
              <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface-2 px-3 py-1 text-xs text-fg/90">
                <m.icon className={`size-3.5 ${m.tone}`} /> {k === "report" ? "Fotos & Berichte" : m.label === "Idee" ? "Ideen" : m.label === "Anleitung" ? "Anleitungen" : "Event-Vorschläge"}
              </span>
            );
          })}
        </div>
        <GateLink href="/community-board" className={buttonClasses("secondary", "md", "mt-4")}>Zum Community-Board</GateLink>
      </div>
    );
  }

  if (feed === null) {
    return <div className="flex items-center justify-center rounded-card border border-line bg-surface p-6"><Loader2 className="size-4 animate-spin text-primary" /></div>;
  }
  if (feed.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-5 text-center">
        <p className="text-sm text-muted">Noch nichts los — teil als Erste:r ein Bild, eine Idee oder einen Event-Vorschlag.</p>
        <Link href="/community-board?neu=beitrag" className={buttonClasses("primary", "sm", "mt-3")}>Etwas teilen</Link>
      </div>
    );
  }

  return (
    <div className="-mx-4 flex snap-x snap-mandatory items-stretch gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
      {feed.map(entry => {
        const meta = KIND_META[entry.kind] ?? KIND_META.report;
        const image = entryImage(entry);
        const name = entry.author.username ?? entry.author.name ?? "?";
        const title = entry.title ?? entry.caption ?? "Neuer Beitrag";
        return (
          <article key={`${entry.kind}-${entry.id}`}
            className="group relative h-56 w-fit shrink-0 snap-start overflow-hidden rounded-card border border-line bg-surface shadow-card sm:h-64"
            style={{ minWidth: image ? "120px" : "170px", maxWidth: image ? "300px" : "240px" }}>
            {/* Ganze Karte führt zum Eintrag — die Aktion liegt darüber (z-20) */}
            <Link href={entryHref(entry)} aria-label={`${meta.label}: ${title}`} className="absolute inset-0 z-10" />
            {image ? (
              isVideoUrl(image)
                ? <video src={image} muted playsInline className="relative h-full w-auto object-cover transition-transform duration-700 group-hover:scale-105" />
                // eslint-disable-next-line @next/next/no-img-element -- beliebiger Blob-Host, Breite folgt dem Seitenverhältnis
                : <img src={image} alt="" className="relative h-full w-auto object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              // Ohne Bild bestimmt der Text die Breite
              <div className="relative flex h-full flex-col gap-2 p-3">
                <p className="line-clamp-6 whitespace-normal text-sm font-bold leading-snug text-fg group-hover:text-primary-fg">{title}</p>
              </div>
            )}
            <span className={`absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-canvas/85 px-2 py-0.5 text-xs font-semibold ${meta.tone}`}>
              <meta.icon className="size-3.5" /> {meta.label}
            </span>
            <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-1.5 p-2.5 ${image ? "bg-gradient-to-t from-canvas via-canvas/80 to-transparent pt-10" : ""}`}>
              <div className="flex items-center gap-1.5">
                <RankedAvatar userId={entry.author.id} src={entry.author.image} alt={name} size={20} />
                <span className="truncate text-xs text-fg/85">{name}</span>
              </div>
              {image && <p className="line-clamp-2 text-xs font-semibold leading-snug text-fg">{title}</p>}
              <CardAction entry={entry} meId={meId} />
            </div>
          </article>
        );
      })}
    </div>
  );
}
