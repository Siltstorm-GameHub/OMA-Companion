"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Globe, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, Users } from "@/components/icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import GameCover from "@/components/GameCover";
import { EmptyState } from "@/components/EmptyState";
import ServerForm, { EMPTY_FORM, formFromServer, formToPayload, type ServerFormState } from "./ServerForm";

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
  maxSlots: number;
  isOnline: boolean;
  openAccess: boolean;
  occupied: number;
  pendingCount: number;
  light: Light;
};

const ONLINE_COLOR = "#34d399";
const OFFLINE_COLOR = "#71717a";

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
  const { confirm, ConfirmDialogElement } = useConfirm();

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

  // Der Schalter bestimmt, ob der Server für alle als online oder offline angezeigt wird.
  async function toggleOnline(server: Server) {
    const res = await fetch(`/api/admin/servers/${server.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOnline: !server.isOnline }),
    });
    if (!res.ok) { toast.error(await errorMessage(res, "Fehler")); return; }
    const updated = await res.json();
    setServers((s) => s.map((x) => (x.id === server.id ? updated : x)));
    toast.success(`${updated.name} wird jetzt als ${updated.isOnline ? "online" : "offline"} angezeigt`);
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
            <div key={server.id} className="rounded-xl glass overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.06)", opacity: server.isOnline ? 1 : 0.6 }}>
              <div className="flex items-center gap-3 px-4 py-3">
                <GameCover game={server.game} className="w-9 h-9" rounded="rounded-lg" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 shrink-0 rounded-full" style={{ backgroundColor: server.isOnline ? ONLINE_COLOR : OFFLINE_COLOR }} />
                    {server.name}
                    {server.openAccess && (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-teal-500/15 border border-teal-500/25 text-teal-300 shrink-0">
                        <Globe className="w-2.5 h-2.5" /> Offen für alle
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500">
                    {server.game} · {server.isOnline ? "online" : "offline"}
                    {!server.openAccess && ` · ${server.occupied}/${server.maxSlots} Plätze belegt`}
                    {server.pendingCount > 0 && (
                      <span className="text-amber-400"> · {server.pendingCount} offene Bewerbung{server.pendingCount === 1 ? "" : "en"}</span>
                    )}
                    {!server.joinInstructions?.trim() && (
                      <span className="text-amber-400"> · Keine Beitritts-Anleitung hinterlegt</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/admin/servers/${server.id}/applications`}
                    className="relative p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Bewerbungen" aria-label="Bewerbungen">
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
                  <button onClick={() => toggleOnline(server)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
                    title={server.isOnline ? "Online — klicken, um als offline anzuzeigen" : "Offline — klicken, um als online anzuzeigen"}
                    aria-label={server.isOnline ? "Als offline anzeigen" : "Als online anzeigen"} aria-pressed={server.isOnline}>
                    {server.isOnline ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
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
