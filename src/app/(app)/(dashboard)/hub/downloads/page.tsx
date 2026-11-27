import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyStateBox } from "@/components/hub/EmptyStateBox";
import { ChevronRight, Download, FileText, Wand2 } from "@/components/icons";
import { HUB_DOWNLOAD_CATEGORIES, formatBytes, isImageMime } from "@/lib/hub-downloads";

export const metadata: Metadata = { title: "Downloads | OMA Hub" };

/** OMA Hub → Downloads: Hintergrundbilder, Setup-Dateien und weitere Assets des Teams. */
export default async function HubDownloadsPage() {
  const items = await prisma.hubDownload.findMany({
    where: { published: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  const sections = HUB_DOWNLOAD_CATEGORIES.map((c) => ({ ...c, items: items.filter((i) => i.category === c.key) }))
    .filter((s) => s.items.length > 0);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <header className="space-y-1">
        <div className="flex items-center gap-2 text-primary">
          <Download className="size-5" />
          <span className="text-xs font-semibold uppercase tracking-widest">OMA Downloads</span>
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-fg sm:text-3xl">Digitale Assets</h1>
        <p className="text-sm text-muted">Hintergrundbilder, Setup-Dateien und mehr — kostenlos für die Community.</p>
      </header>

      {/* Teaser: eigenes Wallpaper bauen */}
      <Link
        href="/hub/wallpaper"
        className="card-hover flex items-center gap-4 rounded-card border border-primary/30 bg-primary-soft p-4 sm:p-5"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-control bg-primary text-primary-ink">
          <Wand2 className="size-6" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-bold text-fg">Wallpaper-Studio</span>
          <span className="block text-sm text-muted">Mach aus deinem Profilbild (oder einem Bild deiner Wahl) dein persönliches OMA-Hintergrundbild.</span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-subtle" />
      </Link>

      {sections.length === 0 && <EmptyStateBox text="Hier gibt es bald Hintergrundbilder, Setup-Dateien und mehr." />}

      {sections.map((s) => (
        <section key={s.key} className="space-y-3">
          <h2 className="text-lg font-bold text-fg">{s.label}</h2>

          {s.key === "wallpaper" ? (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.items.map((i) => (
                <li key={i.id}>
                  <Card padded={false} className="overflow-hidden">
                    <div className="aspect-video bg-surface-2">
                      {isImageMime(i.mimeType) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.fileUrl} alt={i.title} loading="lazy" className="size-full object-cover" />
                      ) : (
                        <div className="grid size-full place-items-center"><FileText className="size-8 text-muted" /></div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-fg">{i.title}</p>
                        <p className="text-xs text-subtle">{formatBytes(i.fileSize)}</p>
                      </div>
                      <DownloadButton id={i.id} label={`${i.title} herunterladen`} />
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="space-y-2">
              {s.items.map((i) => (
                <li key={i.id}>
                  <Card padded={false} className="flex items-center gap-3 p-3 sm:p-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-control bg-surface-2 text-primary">
                      <FileText className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-fg">{i.title}</p>
                        {i.version && <Badge tone="primary">v{i.version}</Badge>}
                      </div>
                      {i.description && <p className="text-sm text-muted">{i.description}</p>}
                      <p className="text-xs text-subtle">{i.fileName} · {formatBytes(i.fileSize)}</p>
                    </div>
                    <DownloadButton id={i.id} label={`${i.title} herunterladen`} withText />
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}

function DownloadButton({ id, label, withText }: { id: string; label: string; withText?: boolean }) {
  return (
    <a
      href={`/api/hub/downloads/${id}`}
      aria-label={label}
      rel="nofollow"
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-control bg-primary px-3 text-sm font-bold text-primary-ink hover:bg-primary-hover"
    >
      <Download className="size-4" />
      {withText && <span className="hidden sm:inline">Herunterladen</span>}
    </a>
  );
}
