"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Download, Loader2, Newspaper, ImagePlus, Megaphone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import ImageCropTool from "@/components/community-jobs/ImageCropTool";
import { downloadFile, downloadText } from "@/lib/download-file";

/**
 * Admin-Bearbeitung/-Zuschnitt/-Download für Berichte, Fotograf-Assets und
 * Marketing-Posts — reuse der bestehenden Community-Board-Feed-API (liefert
 * bereits alle nötigen Felder), Schreibzugriff über die schon vorhandenen
 * Content-Routen, die jetzt per `isAdmin`-Bypass auch für Moderatoren/Admins
 * greifen (siehe journalist-/fotograf-/marketing-manager-service.ts).
 */

interface Author { id: string; username: string | null; name: string | null }
interface FeedEntry {
  kind: "report" | "asset" | "marketing_post" | "idea";
  id: string;
  title?: string;
  caption?: string;
  bodyMarkdown?: string;
  url?: string;
  author: Author;
  coverAsset?: { id: string; url: string } | null;
  imageUrl?: string | null;
  asset?: { id: string; url: string } | null;
  adminConfirmedPosted?: boolean;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

function entryImage(e: FeedEntry): { url: string; assetId?: string; via: "coverAsset" | "asset" | "imageUrl" } | null {
  if (e.kind === "asset" && e.url) return { url: e.url, via: "imageUrl" };
  if (e.kind === "report" && e.coverAsset) return { url: e.coverAsset.url, assetId: e.coverAsset.id, via: "coverAsset" };
  if (e.kind === "marketing_post") {
    if (e.imageUrl) return { url: e.imageUrl, via: "imageUrl" };
    if (e.asset) return { url: e.asset.url, assetId: e.asset.id, via: "asset" };
  }
  return null;
}

const KIND_ICON = { report: Newspaper, asset: ImagePlus, marketing_post: Megaphone, idea: Newspaper } as const;
const KIND_LABEL: Record<FeedEntry["kind"], string> = {
  report: "Bericht", asset: "Fotograf-Asset", marketing_post: "Marketing-Post", idea: "Idee",
};

export default function AdminContentSection() {
  const [entries, setEntries] = useState<FeedEntry[] | null>(null);
  const [editing, setEditing] = useState<FeedEntry | null>(null);

  function reload() {
    api<{ feed: FeedEntry[] }>("/api/community-board?limit=50")
      .then(d => setEntries(d.feed.filter(e => e.kind !== "idea")))
      .catch(() => setEntries([]));
  }
  useEffect(reload, []);

  async function toggleConfirmedPosted(entry: FeedEntry, confirmed: boolean) {
    try {
      await api(`/api/admin/community-jobs/marketing-posts/${entry.id}`, { method: "PATCH", body: JSON.stringify({ confirmed }) });
      toast.success(confirmed ? "Als gepostet bestätigt" : "Bestätigung zurückgenommen");
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    }
  }

  async function downloadEntry(entry: FeedEntry) {
    const image = entryImage(entry);
    try {
      if (image) await downloadFile(image.url, `${entry.kind}-${entry.id}.png`);
      const text = [entry.title, entry.caption, entry.bodyMarkdown].filter(Boolean).join("\n\n");
      if (text) downloadText(text, `${entry.kind}-${entry.id}.txt`);
      if (!image && !text) toast.error("Nichts zum Herunterladen vorhanden");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download fehlgeschlagen");
    }
  }

  if (entries === null) return <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;

  return (
    <section className="space-y-2">
      <h2 className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Beiträge verwalten</h2>
      <p className="text-[11px] text-gray-600">Bearbeiten (inkl. Zuschnitt) und Herunterladen für Social-Media-Vorbereitung — vor allem für Marketing-Manager- und Fotograf-Beiträge gedacht.</p>
      <div className="glass rounded-xl overflow-hidden divide-y divide-white/[0.04]">
        {entries.length === 0 && <p className="p-4 text-xs text-gray-600">Keine Beiträge vorhanden.</p>}
        {entries.map(entry => {
          const Icon = KIND_ICON[entry.kind];
          const image = entryImage(entry);
          return (
            <div key={`${entry.kind}-${entry.id}`} className="p-3 flex items-center gap-3">
              {image && (
                // eslint-disable-next-line @next/next/no-img-element -- kleine Vorschau, beliebiger Blob-Host
                <img src={image.url} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-teal-400 shrink-0" />
                  <span className="text-[10px] text-gray-600">{KIND_LABEL[entry.kind]} · {entry.author.username ?? entry.author.name}</span>
                </div>
                <p className="text-xs text-gray-300 truncate">{entry.title ?? entry.caption}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                {entry.kind === "marketing_post" && (
                  <Button size="sm" variant={entry.adminConfirmedPosted ? "outline" : "primary"}
                    icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    onClick={() => toggleConfirmedPosted(entry, !entry.adminConfirmedPosted)}>
                    {entry.adminConfirmedPosted ? "Bestätigung zurücknehmen" : "Als gepostet bestätigen"}
                  </Button>
                )}
                <Button size="sm" variant="outline" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => setEditing(entry)}>Bearbeiten</Button>
                <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={() => downloadEntry(entry)}>Download</Button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing ? `${KIND_LABEL[editing.kind]} bearbeiten` : ""} size="lg">
        {editing && <AdminEditForm entry={editing} onDone={() => { setEditing(null); reload(); }} />}
      </Modal>
    </section>
  );
}

function AdminEditForm({ entry, onDone }: { entry: FeedEntry; onDone: () => void }) {
  const [title, setTitle] = useState(entry.title ?? "");
  const [caption, setCaption] = useState(entry.caption ?? "");
  const [busy, setBusy] = useState(false);
  const [cropping, setCropping] = useState(false);
  const image = entryImage(entry);

  async function saveText() {
    setBusy(true);
    try {
      if (entry.kind === "report") {
        await api(`/api/community-jobs/reports/${entry.id}`, { method: "PATCH", body: JSON.stringify({ title, bodyMarkdown: entry.bodyMarkdown ?? "" }) });
      } else if (entry.kind === "asset") {
        await api(`/api/community-jobs/media/${entry.id}`, { method: "PATCH", body: JSON.stringify({ caption }) });
      } else if (entry.kind === "marketing_post") {
        await api(`/api/community-jobs/marketing-posts/${entry.id}`, { method: "PATCH", body: JSON.stringify({ caption }) });
      }
      toast.success("Gespeichert");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  async function saveCroppedImage(newUrl: string) {
    setBusy(true);
    try {
      if (!image) return;
      if (image.via === "coverAsset" || image.via === "asset") {
        // Zuschnitt betrifft den zugrundeliegenden JobMediaAsset direkt (auch überall dort sichtbar, wo er sonst noch eingebunden ist).
        await api(`/api/community-jobs/media/${image.assetId}`, { method: "PATCH", body: JSON.stringify({ url: newUrl }) });
      } else if (entry.kind === "asset") {
        await api(`/api/community-jobs/media/${entry.id}`, { method: "PATCH", body: JSON.stringify({ url: newUrl }) });
      } else if (entry.kind === "marketing_post") {
        await api(`/api/community-jobs/marketing-posts/${entry.id}`, { method: "PATCH", body: JSON.stringify({ imageUrl: newUrl }) });
      }
      toast.success("Zuschnitt gespeichert");
      setCropping(false);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  if (cropping && image) {
    return <ImageCropTool imageUrl={image.url} onCropped={saveCroppedImage} onCancel={() => setCropping(false)} />;
  }

  return (
    <div className="space-y-3">
      {entry.kind === "report" && (
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titel"
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40" />
      )}
      {entry.kind !== "report" && (
        <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder="Text" rows={4}
          className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none" />
      )}
      {entry.kind === "report" && (
        <p className="text-[11px] text-gray-600">Der Fließtext des Berichts lässt sich hier bewusst nicht ändern (nur Titel + Bild) — größere inhaltliche Korrekturen bitte mit dem Autor klären oder den Beitrag verbergen.</p>
      )}
      {image && (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau, beliebiger Blob-Host */}
          <img src={image.url} alt="" className="w-full rounded-lg" />
          <Button size="sm" variant="outline" onClick={() => setCropping(true)}>Bild zuschneiden</Button>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onDone}>Abbrechen</Button>
        <Button loading={busy} onClick={saveText}>Speichern</Button>
      </div>
    </div>
  );
}
