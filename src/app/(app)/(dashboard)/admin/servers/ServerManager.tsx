"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Globe, Loader2, Pencil, Plus, RefreshCw, Sparkles, ToggleLeft, ToggleRight, Trash2, Users } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import GameCover from "@/components/GameCover";
import { EmptyState } from "@/components/EmptyState";
import { useLiveStatus } from "@/lib/useServerLiveStatus";
import ServerForm, { EMPTY_FORM, defaultJoinInstructions, formFromServer, formToPayload, type ServerFormState } from "./ServerForm";

type Light = "green" | "yellow" | "red";

type Server = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  joinInstructions: string | null;
  host: string;
  port: string | null;
  password: string | null;
  ampInstanceId: string | null;
  queryType: string | null;
  gamedigType: string | null;
  queryPort: string | null;
  queryTelnetPort: string | null;
  queryTelnetPassword: string | null;
  maxSlots: number;
  isActive: boolean;
  openAccess: boolean;
  occupied: number;
  pendingCount: number;
  light: Light;
};

const LIGHT_COLOR: Record<Light, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};
const UNKNOWN_COLOR = "#71717a";

type AmpSuggestion = { ampInstanceId: string; name: string; game: string; port: string | null; maxPlayers: number | null };

async function errorMessage(res: Response, fallback: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return data?.error ?? fallback;
}

export default function ServerManager({ initialServers }: { initialServers: Server[] }) {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [form, setForm] = useState<ServerFormState>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ServerFormState>(EMPTY_FORM);
  const [savingEdit, setSavingEdit] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [ampSuggestions, setAmpSuggestions] = useState<AmpSuggestion[]>([]);
  const { confirm, ConfirmDialogElement } = useConfirm();

  // Gleicht mit AMP ab: deaktiviert Server, deren Instanz verschwunden ist, und zeigt
  // neue AMP-Instanzen ohne verknüpften Server als Vorschlag an.
  async function syncWithAmp() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/amp/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "AMP-Abgleich fehlgeschlagen"); return; }
      const { deactivated, suggestions } = data as { deactivated: { id: string; name: string }[]; suggestions: AmpSuggestion[] };
      if (deactivated.length > 0) {
        const deactivatedIds = new Set(deactivated.map((d) => d.id));
        setServers((s) => s.map((x) => (deactivatedIds.has(x.id) ? { ...x, isActive: false } : x)));
      }
      setAmpSuggestions(suggestions);
      if (deactivated.length === 0 && suggestions.length === 0) {
        toast.success("Alles im Einklang mit AMP");
      } else {
        const parts = [];
        if (deactivated.length > 0) parts.push(`${deactivated.length} deaktiviert (nicht mehr in AMP)`);
        if (suggestions.length > 0) parts.push(`${suggestions.length} neue Instanz${suggestions.length === 1 ? "" : "en"} gefunden`);
        toast.success(parts.join(" · "));
      }
    } finally {
      setSyncing(false);
    }
  }

  // Übernimmt einen AMP-Vorschlag in das "Server anlegen"-Formular; Host/Passwort bleiben manuell.
  function applySuggestion(suggestion: AmpSuggestion) {
    setForm({
      ...EMPTY_FORM, name: suggestion.name, game: suggestion.game, port: suggestion.port ?? "",
      statusSource: "amp", ampInstanceId: suggestion.ampInstanceId,
      maxSlots: suggestion.maxPlayers ? String(suggestion.maxPlayers) : EMPTY_FORM.maxSlots,
      joinInstructions: defaultJoinInstructions(suggestion.game),
    });
    setAmpSuggestions((s) => s.filter((x) => x.ampInstanceId !== suggestion.ampInstanceId));
    toast("Bitte Host/IP und ggf. Passwort ergänzen, dann anlegen", { icon: "ℹ️" });
  }

  async function createServer() {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      if (!res.ok) { toast.error(await errorMessage(res, "Fehler beim Anlegen")); return; }
      const created = await res.json();
      setServers((s) => [created, ...s]);
      setForm(EMPTY_FORM);
      toast.success(`${created.name} angelegt`);
    } finally {
      setCreating(false);
    }
  }

  function startEdit(server: Server) {
    setEditingId(server.id);
    setEditForm(formFromServer(server));
  }

  async function saveEdit(id: string) {
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/admin/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(editForm)),
      });
      if (!res.ok) { toast.error(await errorMessage(res, "Fehler beim Speichern")); return; }
      const updated = await res.json();
      setServers((s) => s.map((x) => (x.id === id ? updated : x)));
      setEditingId(null);
      toast.success("Gespeichert");
    } finally {
      setSavingEdit(false);
    }
  }

  async function toggleActive(server: Server) {
    const res = await fetch(`/api/admin/servers/${server.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !server.isActive }),
    });
    if (!res.ok) { toast.error(await errorMessage(res, "Fehler")); return; }
    const updated = await res.json();
    setServers((s) => s.map((x) => (x.id === server.id ? updated : x)));
  }

  async function deleteServer(server: Server) {
    if (!(await confirm({ title: "Server löschen", description: `${server.name} wirklich löschen? Alle Bewerbungen werden mitgelöscht.`, variant: "danger" }))) return;
    const res = await fetch(`/api/admin/servers/${server.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Fehler beim Löschen"); return; }
    setServers((s) => s.filter((x) => x.id !== server.id));
    toast.success("Server gelöscht");
  }

  return (
    <div className="space-y-6">
      {/* ── AMP-Abgleich ─────────────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-white">AMP-Abgleich</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Erkennt neue oder verschwundene Instanzen auf dem AMP-Controller.
            </p>
          </div>
          <button onClick={syncWithAmp} disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 hover:bg-teal-500/25 disabled:opacity-40 transition-colors shrink-0">
            {syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            Mit AMP abgleichen
          </button>
        </div>
        {ampSuggestions.length > 0 && (
          <div className="space-y-1.5 pt-1">
            {ampSuggestions.map((s) => (
              <div key={s.ampInstanceId} className="flex items-center gap-3 rounded-xl bg-white/5 border border-white/10 px-3 py-2">
                <Sparkles className="w-3.5 h-3.5 text-teal-300 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.game || "unbekanntes Spiel"}{s.port ? ` · Port ${s.port}` : ""} · noch nicht angelegt</p>
                </div>
                <button onClick={() => applySuggestion(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 transition-colors shrink-0">
                  Übernehmen
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Neuen Server anlegen ─────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-semibold text-white">Server anlegen</h2>
        <ServerForm value={form} onChange={setForm} variant="create" submitLabel="Server anlegen"
          submitIcon={<Plus className="w-3.5 h-3.5" />} saving={creating} onSubmit={createServer} />
      </div>

      {/* ── Server-Liste ────────────────────────────────────────── */}
      {servers.length === 0 ? (
        <EmptyState
          type="generic"
          title="Noch keine Server eingetragen"
          description="Lege oben den ersten Community-Server an."
        />
      ) : (
        <div className="space-y-2">
          {servers.map((server) => (
            <div key={server.id} className="rounded-xl glass overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", opacity: server.isActive ? 1 : 0.5 }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <GameCover game={server.game} className="w-9 h-9" rounded="rounded-lg" />
                <ServerSummary server={server} />
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/admin/servers/${server.id}/applications`}
                    className="relative p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Bewerbungen">
                    <Users className="w-3.5 h-3.5" />
                    {server.pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 rounded-full bg-amber-500 text-[9px] font-bold text-black flex items-center justify-center px-1">
                        {server.pendingCount > 9 ? "9+" : server.pendingCount}
                      </span>
                    )}
                  </Link>
                  <button onClick={() => (editingId === server.id ? setEditingId(null) : startEdit(server))}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors" title="Bearbeiten" aria-label="Bearbeiten">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(server)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
                    title={server.isActive ? "Deaktivieren" : "Aktivieren"} aria-label={server.isActive ? "Deaktivieren" : "Aktivieren"}>
                    {server.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteServer(server)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-colors"
                    title="Löschen" aria-label="Löschen">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingId === server.id && (
                <div className="px-4 pb-4 border-t border-white/[0.05] pt-3">
                  <ServerForm value={editForm} onChange={setEditForm} variant="edit" submitLabel="Speichern"
                    saving={savingEdit} onSubmit={() => saveEdit(server.id)} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {ConfirmDialogElement}
    </div>
  );
}

// Kopfzeile eines Servers. Bei "Offen für alle" gibt es keine Platzvergabe per Bewerbung —
// dort zeigen Ampel und Text den Live-Status statt der (immer leeren) belegten Plätze.
function ServerSummary({ server }: { server: Server }) {
  const live = useLiveStatus(server.id);
  const liveText = live
    ? live.online
      ? `${live.currentPlayers ?? 0}${live.maxPlayers ? `/${live.maxPlayers}` : ""} online`
      : "offline"
    : null;
  const dotColor = server.openAccess
    ? live ? (live.online ? LIGHT_COLOR.green : LIGHT_COLOR.red) : UNKNOWN_COLOR
    : LIGHT_COLOR[server.light];

  return (
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
        <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
        {server.name}
        {server.openAccess && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 shrink-0">
            <Globe className="w-2.5 h-2.5" /> Offen für alle
          </span>
        )}
      </p>
      <p className="text-xs text-gray-500">
        {server.game}
        {server.openAccess
          ? ` · ${liveText ?? "kein Live-Status"}`
          : ` · ${server.occupied}/${server.maxSlots} Plätze belegt${liveText ? ` · ${liveText}` : ""}`}
        {server.pendingCount > 0 && (
          <span className="text-amber-400"> · {server.pendingCount} offene Bewerbung{server.pendingCount === 1 ? "" : "en"}</span>
        )}
        {!server.joinInstructions?.trim() && (
          <span className="text-amber-400"> · Keine Beitritts-Anleitung hinterlegt</span>
        )}
      </p>
    </div>
  );
}
