"use client";
import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ArrowDown, ArrowUp, Download, Eye, EyeOff, FileText, Pencil, Trash2, Upload, X, Check } from "@/components/icons";
import {
  HUB_DOWNLOAD_CATEGORIES,
  HUB_DOWNLOAD_MAX_BYTES,
  HUB_DOWNLOAD_PREFIX,
  formatBytes,
  isImageMime,
  sanitizeFileName,
  type HubDownloadCategory,
  type HubDownloadDTO,
} from "@/lib/hub-downloads";

type Item = HubDownloadDTO;

function toItem(raw: Item & { createdAt: string | Date }): Item {
  return { ...raw, createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString() };
}

function titleFromFileName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
}

export default function AdminDownloadsClient({ initial }: { initial: Item[] }) {
  const [items, setItems] = useState<Item[]>(initial);

  // Upload-Formular
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<HubDownloadCategory>("wallpaper");
  const [version, setVersion] = useState("");
  const [published, setPublished] = useState(true);
  const [progress, setProgress] = useState<number | null>(null);

  // Bearbeiten / Löschen
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ title: "", description: "", category: "other" as HubDownloadCategory, version: "" });
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);

  function pickFile(f: File | null) {
    setFile(f);
    if (!f) return;
    if (f.size > HUB_DOWNLOAD_MAX_BYTES) {
      toast.error(`Datei ist zu groß (max. ${formatBytes(HUB_DOWNLOAD_MAX_BYTES)})`);
      setFile(null);
      return;
    }
    if (!title) setTitle(titleFromFileName(f.name));
    setCategory(f.type.startsWith("image/") ? "wallpaper" : /\.(exe|msi|dmg|apk|zip|7z|rar)$/i.test(f.name) ? "setup" : "other");
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !title.trim()) return;
    const contentType = file.type || "application/octet-stream";
    setProgress(0);
    try {
      const blob = await upload(`${HUB_DOWNLOAD_PREFIX}${crypto.randomUUID()}/${sanitizeFileName(file.name)}`, file, {
        access: "public",
        handleUploadUrl: "/api/admin/hub-downloads/upload",
        contentType,
        multipart: file.size > 20 * 1024 * 1024,
        onUploadProgress: (p) => setProgress(p.percentage),
      });
      const res = await fetch("/api/admin/hub-downloads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          category,
          version: version.trim() || null,
          fileUrl: blob.url,
          fileName: file.name,
          fileSize: file.size,
          mimeType: contentType,
          published,
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Speichern fehlgeschlagen");
      const created = toItem(await res.json());
      setItems((prev) => [created, ...prev]);
      toast.success("Download hinzugefügt");
      setFile(null); setTitle(""); setDescription(""); setVersion("");
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setProgress(null);
    }
  }

  async function patch(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/admin/hub-downloads/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { toast.error("Speichern fehlgeschlagen"); return null; }
    const updated = toItem(await res.json());
    setItems((prev) => prev.map((i) => (i.id === id ? updated : i)));
    return updated;
  }

  async function move(item: Item, dir: -1 | 1) {
    const siblings = items.filter((i) => i.category === item.category).sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
    const idx = siblings.findIndex((i) => i.id === item.id);
    const other = siblings[idx + dir];
    if (!other) return;
    // Reihenfolge normalisieren, dann die beiden tauschen
    const order = siblings.map((s) => s.id);
    [order[idx], order[idx + dir]] = [order[idx + dir], order[idx]];
    await Promise.all(order.map((id, i) => {
      const cur = siblings.find((s) => s.id === id)!;
      return cur.sortOrder === i ? null : patch(id, { sortOrder: i });
    }));
  }

  async function confirmDelete() {
    if (!deleteItem) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/hub-downloads/${deleteItem.id}`, { method: "DELETE" });
    setDeleting(false);
    if (!res.ok) { toast.error("Löschen fehlgeschlagen"); return; }
    setItems((prev) => prev.filter((i) => i.id !== deleteItem.id));
    toast.success("Download gelöscht");
    setDeleteItem(null);
  }

  const uploading = progress !== null;

  return (
    <div className="space-y-8">
      <Card>
        <form onSubmit={handleUpload} className="space-y-4">
          <h2 className="font-bold text-fg">Neue Datei hochladen</h2>

          <label
            className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line-strong bg-surface-2 p-4 text-center hover:border-primary"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); pickFile(e.dataTransfer.files?.[0] ?? null); }}
          >
            <Upload className="size-6 text-primary" />
            {file ? (
              <span className="text-sm text-fg">
                <strong>{file.name}</strong> · {formatBytes(file.size)}
              </span>
            ) : (
              <span className="text-sm text-muted">Datei auswählen oder hierher ziehen (max. {formatBytes(HUB_DOWNLOAD_MAX_BYTES)})</span>
            )}
            <input ref={fileRef} type="file" className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} required />
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-semibold text-fg">Kategorie</span>
              <Select size="md" className="h-11" value={category} onChange={(e) => setCategory(e.target.value as HubDownloadCategory)}>
                {HUB_DOWNLOAD_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
            </div>
          </div>
          <Textarea label="Beschreibung (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={1000} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Version (optional)" placeholder="z. B. 1.2.0" value={version} onChange={(e) => setVersion(e.target.value)} maxLength={40} />
            <label className="flex items-center gap-2 self-end pb-3 text-sm text-fg">
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="size-4 accent-[var(--color-primary)]" />
              Sofort sichtbar
            </label>
          </div>

          {uploading && (
            <div className="h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${progress}%` }} />
            </div>
          )}

          <Button type="submit" loading={uploading} disabled={!file || !title.trim()} icon={<Upload className="size-4" />}>
            {uploading ? `Lädt hoch … ${Math.round(progress ?? 0)} %` : "Hochladen"}
          </Button>
        </form>
      </Card>

      {HUB_DOWNLOAD_CATEGORIES.map((cat) => {
        const list = items
          .filter((i) => i.category === cat.key)
          .sort((a, b) => a.sortOrder - b.sortOrder || b.createdAt.localeCompare(a.createdAt));
        return (
          <section key={cat.key} className="space-y-3">
            <h2 className="font-bold text-fg">{cat.label} <span className="text-sm font-normal text-subtle">({list.length})</span></h2>
            {list.length === 0 ? (
              <p className="text-sm text-subtle">Noch nichts hochgeladen.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((item, idx) => (
                  <li key={item.id}>
                    <Card padded={false} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-control bg-surface-2">
                        {isImageMime(item.mimeType) ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.fileUrl} alt="" className="size-full object-cover" loading="lazy" />
                        ) : (
                          <FileText className="size-6 text-muted" />
                        )}
                      </div>

                      {editId === item.id ? (
                        <div className="grid flex-1 gap-2 sm:grid-cols-2">
                          <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} aria-label="Titel" />
                          <Select size="md" className="h-11" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value as HubDownloadCategory })}>
                            {HUB_DOWNLOAD_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
                          </Select>
                          <Input value={edit.version} placeholder="Version" onChange={(e) => setEdit({ ...edit, version: e.target.value })} aria-label="Version" />
                          <Input value={edit.description} placeholder="Beschreibung" onChange={(e) => setEdit({ ...edit, description: e.target.value })} aria-label="Beschreibung" />
                        </div>
                      ) : (
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-fg">{item.title}</span>
                            {item.version && <Badge>v{item.version}</Badge>}
                            {!item.published && <Badge tone="warning">Versteckt</Badge>}
                          </div>
                          <p className="truncate text-xs text-subtle">
                            {item.fileName} · {formatBytes(item.fileSize)} · {item.downloadCount}× heruntergeladen
                          </p>
                          {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>}
                        </div>
                      )}

                      <div className="flex shrink-0 flex-wrap items-center gap-1">
                        {editId === item.id ? (
                          <>
                            <Button size="sm" icon={<Check className="size-4" />} onClick={async () => {
                              if (!edit.title.trim()) return;
                              if (await patch(item.id, { title: edit.title, description: edit.description || null, category: edit.category, version: edit.version || null })) setEditId(null);
                            }}>Speichern</Button>
                            <Button size="sm" variant="ghost" aria-label="Abbrechen" onClick={() => setEditId(null)}><X className="size-4" /></Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="ghost" aria-label="Nach oben" disabled={idx === 0} onClick={() => move(item, -1)}><ArrowUp className="size-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label="Nach unten" disabled={idx === list.length - 1} onClick={() => move(item, 1)}><ArrowDown className="size-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label={item.published ? "Verstecken" : "Veröffentlichen"} title={item.published ? "Verstecken" : "Veröffentlichen"}
                              onClick={() => patch(item.id, { published: !item.published })}>
                              {item.published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                            </Button>
                            <a href={item.fileUrl} target="_blank" rel="noopener noreferrer" aria-label="Datei öffnen" title="Datei öffnen"
                              className="grid size-9 place-items-center rounded-control text-muted hover:bg-surface-2 hover:text-fg">
                              <Download className="size-4" />
                            </a>
                            <Button size="sm" variant="ghost" aria-label="Bearbeiten" onClick={() => {
                              setEditId(item.id);
                              setEdit({ title: item.title, description: item.description ?? "", category: item.category as HubDownloadCategory, version: item.version ?? "" });
                            }}><Pencil className="size-4" /></Button>
                            <Button size="sm" variant="ghost" aria-label="Löschen" onClick={() => setDeleteItem(item)}><Trash2 className="size-4 text-danger" /></Button>
                          </>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <ConfirmDialog
        open={!!deleteItem}
        onOpenChange={(o) => { if (!o) setDeleteItem(null); }}
        title="Download löschen?"
        description={deleteItem ? `„${deleteItem.title}“ und die Datei im Speicher werden endgültig entfernt.` : undefined}
        confirmLabel="Löschen"
        variant="danger"
        loading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
