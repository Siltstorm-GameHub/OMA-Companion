"use client";
import FileDropZone from "@/components/FileDropZone";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ImagePlus } from "@/components/icons";
import { ChevronRight } from "@/components/icons";
import { AtSign, Lightbulb, Loader2, Smile, Upload, X } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import MarkdownLite from "./MarkdownLite";
import EmojiPanel from "./EmojiPicker";
import PhotoRequestButton from "./PhotoRequestButton";
import GameCoverPicker, { type PickedGameCover } from "./GameCoverPicker";
import { isGameCoverUrl } from "@/lib/game-cover-url";
import { mentionToken } from "@/lib/report-mentions";
import { isVideoUrl } from "@/lib/upload-limits";
import {
  IDEA_CATEGORIES_SELECTABLE, IDEA_SUPPORT_THRESHOLD, IDEA_TITLE_MAX, IDEA_BODY_MAX, IDEA_MAX_IMAGES, ideaLifecycleMeta, isIdeaImageUrl, parseSteamAppId,
} from "@/lib/idea-lifecycle";

/**
 * Ideen-Formular (Visionär): Kategorie, Vorlage "Problem → Vorschlag → Nutzen", Frist, Vorschau, Hinweis auf
 * ähnliche Ideen, Bilder/Mockups, Steam-Spiel, Emojis und @-Erwähnungen.
 */

export interface IdeaPrefill {
  title?: string; body?: string; link?: string; linkLabel?: string; eventId?: string; reportId?: string; imageUrl?: string;
}

const FIELD = "w-full bg-surface-2 border border-line rounded-control px-3 py-2 text-sm text-fg placeholder:text-subtle focus:outline-none focus:border-primary";
const SMALL = "bg-line border border-line-strong rounded px-2 py-1 text-xs text-fg placeholder:text-subtle focus:outline-none focus:border-primary/40";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  // Offene Community-Jobs: Beitrag über dem Tageslimit — veröffentlicht, zählt aber nicht fürs Gehalt.
  if (typeof data?.notice === "string" && data.notice) toast.warning(data.notice);
  return data as T;
}

interface Similar { id: string; title: string; lifecycle: string; votes: number }
interface FoundUser { id: string; username: string | null; name: string | null }
interface MediaAsset { id: string; url: string; caption: string | null }
interface GameInfo { appId: number; name: string; image: string | null; price: string | null; players: number | null; communityEvents: number }
type AreaKey = "problem" | "proposal" | "benefit" | "body";

export default function IdeaForm({ prefill, onDone }: { prefill?: IdeaPrefill; onDone: () => void }) {
  const [category, setCategory] = useState("");
  const [title, setTitle] = useState(prefill?.title ?? "");
  const [mode, setMode] = useState<"guided" | "free">(prefill?.body ? "free" : "guided");
  const [values, setValues] = useState<Record<AreaKey, string>>({ problem: "", proposal: "", benefit: "", body: prefill?.body ?? "" });
  const [focusKey, setFocusKey] = useState<AreaKey>("proposal");
  const areas = useRef<Partial<Record<AreaKey, HTMLTextAreaElement | null>>>({});
  const [days, setDays] = useState("");
  const [preview, setPreview] = useState(false);
  const [similar, setSimilar] = useState<Similar[]>([]);
  const [busy, setBusy] = useState(false);

  const [panel, setPanel] = useState<null | "emoji" | "mention" | "library" | "cover">(null);
  const [pickedCover, setPickedCover] = useState<PickedGameCover | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionResults, setMentionResults] = useState<FoundUser[]>([]);
  const [images, setImages] = useState<string[]>(prefill?.imageUrl && isGameCoverUrl(prefill.imageUrl) ? [prefill.imageUrl] : []);
  const [uploading, setUploading] = useState(false);
  // Frist, Bilder und Steam-Spiel stehen unter "Mehr Optionen" (offen, wenn schon etwas vorbelegt ist)
  const [moreOpen, setMoreOpen] = useState(!!prefill?.imageUrl);
  const [supportingId, setSupportingId] = useState<string | null>(null);

  /** Ähnliche Idee unterstützen statt eine neue einzureichen */
  async function supportInstead(ideaId: string) {
    setSupportingId(ideaId);
    try {
      await api(`/api/community-jobs/ideas/${ideaId}/interest`, { method: "POST", body: JSON.stringify({ kind: "SUPPORT", on: true }) });
      toast.success("Unterstützt — danke!");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setSupportingId(null);
    }
  }
  const [library, setLibrary] = useState<MediaAsset[]>([]);
  const [libraryQuery, setLibraryQuery] = useState("");
  const [steamInput, setSteamInput] = useState("");
  const [game, setGame] = useState<GameInfo | null>(null);
  const [gameError, setGameError] = useState<string | null>(null);

  useEffect(() => {
    if (title.trim().length < 5) { setSimilar([]); return; }
    const handle = setTimeout(() => {
      api<{ ideas: Similar[] }>(`/api/community-jobs/ideas/similar?title=${encodeURIComponent(title.trim())}`).then(d => setSimilar(d.ideas)).catch(() => {});
    }, 400);
    return () => clearTimeout(handle);
  }, [title]);

  useEffect(() => {
    if (panel !== "mention" || mentionQuery.trim().length < 2) { setMentionResults([]); return; }
    const handle = setTimeout(() => {
      api<FoundUser[]>(`/api/users/search?q=${encodeURIComponent(mentionQuery.trim())}`).then(setMentionResults).catch(() => {});
    }, 250);
    return () => clearTimeout(handle);
  }, [mentionQuery, panel]);

  useEffect(() => {
    if (panel !== "library") return;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ take: "24" });
      if (libraryQuery.trim()) params.set("q", libraryQuery.trim());
      api<{ assets: MediaAsset[] }>(`/api/community-jobs/media?${params}`).then(d => setLibrary(d.assets.filter(a => !isVideoUrl(a.url) && isIdeaImageUrl(a.url)))).catch(() => {});
    }, libraryQuery ? 250 : 0);
    return () => clearTimeout(handle);
  }, [panel, libraryQuery]);

  useEffect(() => {
    const appId = parseSteamAppId(steamInput);
    if (!steamInput.trim()) { setGame(null); setGameError(null); return; }
    if (!appId) { setGame(null); setGameError("Bitte einen Steam-Store-Link einfügen (…/app/12345/…)."); return; }
    const handle = setTimeout(() => {
      api<GameInfo>(`/api/community-jobs/ideas/game?appId=${appId}`).then(g => { setGame(g); setGameError(null); })
        .catch(() => { setGame(null); setGameError("Spiel wurde bei Steam nicht gefunden."); });
    }, 400);
    return () => clearTimeout(handle);
  }, [steamInput]);

  const activeKey: AreaKey = mode === "free" ? "body" : focusKey === "body" ? "proposal" : focusKey;

  function insertText(text: string) {
    const el = areas.current[activeKey];
    const current = values[activeKey];
    const start = el?.selectionStart ?? current.length;
    const end = el?.selectionEnd ?? current.length;
    setValues(v => ({ ...v, [activeKey]: current.slice(0, start) + text + current.slice(end) }));
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(start + text.length, start + text.length); });
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("kind", "community-job-asset");
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload fehlgeschlagen");
      setImages(cur => [...cur, data.url as string].slice(0, IDEA_MAX_IMAGES));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload fehlgeschlagen");
    } finally {
      setUploading(false);
    }
  }

  const guidedParts = [
    values.problem.trim() && `**Problem:** ${values.problem.trim()}`,
    values.proposal.trim() && `**Vorschlag:** ${values.proposal.trim()}`,
    values.benefit.trim() && `**Nutzen:** ${values.benefit.trim()}`,
  ].filter(Boolean);
  const rawBody = mode === "guided" ? guidedParts.join("\n\n") : values.body.trim();
  const description = prefill?.link && !rawBody.includes(prefill.link) ? `${rawBody}\n\n${prefill.link}` : rawBody;
  const canSubmit = title.trim().length > 0 && (mode === "guided" ? values.proposal.trim().length > 0 : values.body.trim().length > 0);

  async function submit() {
    setBusy(true);
    try {
      await api("/api/community-jobs/ideas", {
        method: "POST", body: JSON.stringify({
          title, description, category: category || undefined,
          votingEndsAt: days ? new Date(Date.now() + Number(days) * 86_400_000).toISOString() : undefined,
          sourceEventId: prefill?.eventId, sourceReportId: prefill?.reportId,
          imageUrls: images.length > 0 ? images : undefined, gameAppId: game?.appId,
        }),
      });
      toast.success("Veröffentlicht");
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
    } finally {
      setBusy(false);
    }
  }

  function area(key: AreaKey, rows: number, placeholder: string, extra?: { maxLength?: number; resize?: string }) {
    return (
      <textarea ref={el => { areas.current[key] = el; }} value={values[key]} rows={rows} maxLength={extra?.maxLength}
        onFocus={() => setFocusKey(key)} onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
        placeholder={placeholder} className={`${FIELD} ${extra?.resize ?? "resize-none"}`} />
    );
  }

  const togglePanel = (p: "emoji" | "mention" | "library" | "cover") => setPanel(cur => (cur === p ? null : p));

  return (
    <FileDropZone onFiles={files => { for (const f of files.slice(0, IDEA_MAX_IMAGES - images.length)) uploadImage(f); }} disabled={uploading || images.length >= IDEA_MAX_IMAGES} label="Bild an die Idee hängen" className="rounded-control">
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select value={category} onChange={e => setCategory(e.target.value)} aria-label="Kategorie">
          <option value="">Kategorie wählen…</option>
          {IDEA_CATEGORIES_SELECTABLE.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </Select>
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} maxLength={IDEA_TITLE_MAX} placeholder="Titel deiner Idee" className={FIELD} />
      {similar.length > 0 && (
        <div className="rounded-control bg-coin-soft border border-coin/25 p-3 space-y-2">
          <p className="text-xs text-coin">Gibt es vielleicht schon — dann lieber unterstützen, so kommt die Idee schneller ans Ziel:</p>
          {similar.map(s => (
            <div key={s.id} className="flex items-center gap-2">
              <Link href={`/community-board/idea/${s.id}`} target="_blank" className="min-w-0 flex-1 text-sm text-fg/90 hover:text-primary-fg transition-colors">
                <span className="block truncate">{s.title}</span>
                <span className="block text-xs text-subtle">{ideaLifecycleMeta(s.lifecycle).label} · {s.votes} Stimmen</span>
              </Link>
              <Button size="sm" variant="outline" loading={supportingId === s.id} onClick={() => supportInstead(s.id)}>Stattdessen unterstützen</Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <Button size="sm" variant={mode === "guided" ? "primary" : "outline"} onClick={() => setMode("guided")}>Problem → Vorschlag → Nutzen</Button>
          <Button size="sm" variant={mode === "free" ? "primary" : "outline"} onClick={() => {
            if (mode === "guided" && guidedParts.length > 0 && !values.body.trim()) setValues(v => ({ ...v, body: guidedParts.join("\n\n") }));
            setMode("free");
          }}>Freitext</Button>
        </div>
        <div className="flex items-center gap-0.5">
          <button onClick={() => togglePanel("emoji")} disabled={preview} title="Emoji einfügen" aria-label="Emoji einfügen" aria-expanded={panel === "emoji"}
            className="p-1.5 rounded text-muted hover:text-fg hover:bg-line disabled:opacity-30 transition-colors"><Smile className="w-3.5 h-3.5" /></button>
          <button onClick={() => togglePanel("mention")} disabled={preview} title="Spieler erwähnen" aria-label="Spieler erwähnen" aria-expanded={panel === "mention"}
            className="p-1.5 rounded text-muted hover:text-fg hover:bg-line disabled:opacity-30 transition-colors"><AtSign className="w-3.5 h-3.5" /></button>
          <Button size="sm" variant="ghost" onClick={() => setPreview(v => !v)}>{preview ? "Bearbeiten" : "Vorschau"}</Button>
        </div>
      </div>

      {panel === "emoji" && !preview && <EmojiPanel onPick={insertText} onClose={() => setPanel(null)} />}
      {panel === "mention" && !preview && (
        <div className="rounded-lg border border-line-strong bg-surface/95 p-2 space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <input value={mentionQuery} onChange={e => setMentionQuery(e.target.value)} autoFocus placeholder="Spieler suchen (mind. 2 Zeichen)…" aria-label="Spieler suchen" className={`flex-1 ${SMALL}`} />
            <button onClick={() => setPanel(null)} aria-label="Schließen" className="text-subtle hover:text-fg"><X className="w-3.5 h-3.5" /></button>
          </div>
          {mentionResults.map(u => (
            <button key={u.id} onClick={() => { insertText(`${mentionToken(u.username ?? u.name ?? "Spieler", u.id)} `); setPanel(null); setMentionQuery(""); }}
              className="block w-full text-left text-xs text-fg/90 hover:text-primary-fg px-1.5 py-0.5 rounded hover:bg-line transition-colors">{u.username ?? u.name}</button>
          ))}
        </div>
      )}

      {preview ? (
        <div className="rounded-lg border border-line-strong bg-surface-2 p-3 space-y-1.5">
          <p className="text-sm font-semibold text-fg flex items-center gap-1.5"><Lightbulb className="w-3.5 h-3.5 text-coin" />{title || "—"}</p>
          <MarkdownLite text={description || "—"} className="text-xs text-fg/85" />
        </div>
      ) : mode === "guided" ? (
        <div className="space-y-2">
          {area("problem", 2, "Problem: Was läuft aktuell nicht rund? (optional)")}
          {area("proposal", 3, "Vorschlag: Was schlägst du vor?")}
          {area("benefit", 2, "Nutzen: Was bringt es der Community? (optional)")}
        </div>
      ) : (
        <>
          {area("body", 6, "Beschreibung — Formatierung: **fett**, _kursiv_, - Listen", { maxLength: IDEA_BODY_MAX, resize: "resize-y" })}
          {prefill?.link && <p className="text-xs text-subtle">Link zu {prefill.linkLabel ?? "dem Spiel"} wird automatisch angehängt.</p>}
        </>
      )}

      {/* Bilder / Mockups */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-subtle uppercase tracking-widest">Bilder &amp; Screenshots (optional, bis zu {IDEA_MAX_IMAGES}) — auch per Ziehen oder Strg+V</p>
        <div className="flex flex-wrap items-center gap-2">
          {images.map(u => (
            <span key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- Vorschau, Blob-Host */}
              <img src={u} alt="" className="w-16 h-16 rounded-lg object-cover" />
              <button onClick={() => setImages(cur => cur.filter(x => x !== u))} aria-label="Bild entfernen" className="absolute -top-1.5 -right-1.5 rounded-full bg-surface border border-line-strong p-0.5 text-fg/85 hover:text-red-400"><X className="w-3 h-3" /></button>
            </span>
          ))}
          {images.length < IDEA_MAX_IMAGES && (
            <>
              <label className="flex items-center gap-1.5 text-xs text-muted border border-dashed border-line-strong rounded-lg px-2.5 py-2 cursor-pointer hover:border-primary/30 transition-colors">
                {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />} Hochladen
                <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={uploading}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = ""; }} />
              </label>
              <Button size="sm" variant="outline" icon={<ImagePlus className="w-3.5 h-3.5" />} onClick={() => togglePanel("library")}>Aus Mediathek</Button>
              <Button size="sm" variant="outline" onClick={() => togglePanel("cover")}>Spiel-Cover</Button>
            </>
          )}
        </div>
        <PhotoRequestButton requesterJob="visionaer" eventId={prefill?.eventId} defaultText={title ? `Bild/Mockup zu meiner Idee: ${title}` : ""} />
        {panel === "cover" && (
          <div className="rounded-lg border border-line-strong bg-surface/95 p-2 space-y-2">
            <GameCoverPicker value={pickedCover} onChange={setPickedCover} />
            <div className="flex justify-end gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setPanel(null)}>Abbrechen</Button>
              <Button size="sm" disabled={!pickedCover} onClick={() => {
                if (pickedCover) setImages(cur => (cur.includes(pickedCover.url) ? cur : [...cur, pickedCover.url].slice(0, IDEA_MAX_IMAGES)));
                setPickedCover(null); setPanel(null);
              }}>Übernehmen</Button>
            </div>
          </div>
        )}
        {panel === "library" && (
          <div className="rounded-lg border border-line-strong bg-surface/95 p-2 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <input value={libraryQuery} onChange={e => setLibraryQuery(e.target.value)} placeholder="Mediathek durchsuchen…" aria-label="Mediathek durchsuchen" className={`flex-1 ${SMALL}`} />
              <button onClick={() => setPanel(null)} aria-label="Schließen" className="text-subtle hover:text-fg"><X className="w-3.5 h-3.5" /></button>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-40 overflow-y-auto">
              {library.map(a => (
                <button key={a.id} title={a.caption ?? undefined}
                  onClick={() => { setImages(cur => (cur.includes(a.url) ? cur : [...cur, a.url].slice(0, IDEA_MAX_IMAGES))); setPanel(null); }}
                  className="rounded overflow-hidden border-2 border-transparent hover:border-primary">
                  {/* eslint-disable-next-line @next/next/no-img-element -- Mediathek-Vorschau */}
                  <img src={a.url} alt="" className="w-full h-14 object-cover" />
                </button>
              ))}
              {library.length === 0 && <p className="col-span-full text-xs text-subtle">Nichts gefunden.</p>}
            </div>
          </div>
        )}
      </div>

      <button type="button" onClick={() => setMoreOpen(v => !v)} aria-expanded={moreOpen}
        className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-primary-fg hover:text-fg">
        <ChevronRight className={`size-4 transition-transform ${moreOpen ? "rotate-90" : ""}`} />
        Mehr Optionen <span className="font-normal text-subtle">Frist, Steam-Spiel</span>
      </button>
      {moreOpen && (
      <div className="space-y-4 rounded-control border border-line bg-surface-2 p-3">
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-subtle uppercase tracking-widest">Frist bis zur Team-Prüfung</p>
        <Select value={days} onChange={e => setDays(e.target.value)} aria-label="Frist bis zur Team-Prüfung">
          <option value="">Ohne Frist</option>
          <option value="3">3 Tage</option>
          <option value="7">7 Tage</option>
          <option value="14">14 Tage</option>
          <option value="30">30 Tage</option>
        </Select>
        <p className="text-xs text-subtle">Hat die Idee bis dahin {IDEA_SUPPORT_THRESHOLD} Unterstützer, geht sie automatisch an das Team.</p>
      </div>

      {/* Steam-Spiel */}
      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-subtle uppercase tracking-widest">Spiel auf Steam (optional)</p>
        <input value={steamInput} onChange={e => setSteamInput(e.target.value)} placeholder="Steam-Store-Link, z.B. https://store.steampowered.com/app/252950" className={FIELD} />
        {gameError && <p className="text-xs text-coin">{gameError}</p>}
        {game && (
          <div className="flex items-center gap-3 rounded-lg bg-surface-2 border border-line-strong p-2">
            {game.image && (
              // eslint-disable-next-line @next/next/no-img-element -- Steam-Header-Bild
              <img src={game.image} alt="" className="w-24 h-11 rounded object-cover shrink-0" />
            )}
            <span className="min-w-0 text-xs">
              <span className="block font-semibold text-fg truncate">{game.name}</span>
              <span className="block text-xs text-subtle">
                {[game.price, game.players != null ? `${game.players.toLocaleString("de-DE")} spielen gerade` : null, game.communityEvents > 0 ? `in der Community gespielt (${game.communityEvents} Events)` : null].filter(Boolean).join(" · ")}
              </span>
            </span>
          </div>
        )}
      </div>

      </div>
      )}

      {(prefill?.eventId || prefill?.reportId) && <p className="text-xs text-subtle">Die Idee wird mit {prefill.eventId ? "dem Event" : "dem Bericht"} verknüpft.</p>}

      <div className="flex justify-end">
        <Button loading={busy} disabled={!canSubmit || uploading} icon={<ChevronRight className="w-3.5 h-3.5" />} onClick={submit}>Veröffentlichen</Button>
      </div>
    </div>
    </FileDropZone>
  );
}
