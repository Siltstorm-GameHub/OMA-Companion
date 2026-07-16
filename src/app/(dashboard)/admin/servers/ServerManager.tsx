"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Pencil, Users, Circle, Eye, EyeOff } from "lucide-react";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import GameNameInput from "@/components/GameNameInput";
import GameCover from "@/components/GameCover";
import { parseConnectLink } from "@/lib/connect-link";
import { EmptyState } from "@/components/EmptyState";

type Light = "green" | "yellow" | "red";

type Server = {
  id: string;
  name: string;
  game: string;
  description: string | null;
  host: string;
  port: string | null;
  password: string | null;
  connectInfo: string | null;
  ampInstanceId: string | null;
  maxSlots: number;
  isActive: boolean;
  occupied: number;
  pendingCount: number;
  light: Light;
};

const LIGHT_COLOR: Record<Light, string> = {
  green: "#34d399",
  yellow: "#fbbf24",
  red: "#f87171",
};

type FormState = {
  name: string;
  game: string;
  description: string;
  host: string;
  port: string;
  password: string;
  connectInfo: string;
  ampInstanceId: string;
  maxSlots: string;
};

const EMPTY_FORM: FormState = { name: "", game: "", description: "", host: "", port: "", password: "", connectInfo: "", ampInstanceId: "", maxSlots: "10" };

// Übernimmt Host/Port automatisch aus einem eingefügten Connect-Link (z.B. steam://connect/host:port).
function withConnectLinkAutoFill(prev: FormState, connectInfo: string): FormState {
  const parsed = parseConnectLink(connectInfo);
  return parsed ? { ...prev, connectInfo, host: parsed.host, port: parsed.port } : { ...prev, connectInfo };
}

export default function ServerManager({ initialServers }: { initialServers: Server[] }) {
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const { confirm, ConfirmDialogElement } = useConfirm();

  async function createServer() {
    if (!form.name.trim() || !form.game.trim() || !form.host.trim() || !form.maxSlots) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          game: form.game.trim(),
          description: form.description.trim() || undefined,
          host: form.host.trim(),
          port: form.port.trim() || undefined,
          password: form.password.trim() || undefined,
          connectInfo: form.connectInfo.trim() || undefined,
          ampInstanceId: form.ampInstanceId.trim() || undefined,
          maxSlots: Number(form.maxSlots),
        }),
      });
      if (!res.ok) { toast.error("Fehler beim Anlegen"); return; }
      const created = await res.json();
      setServers((s) => [created, ...s]);
      setForm(EMPTY_FORM);
      toast.success(`${created.name} angelegt`);
    } finally {
      setSaving(false);
    }
  }

  function startEdit(server: Server) {
    setEditingId(server.id);
    setShowEditPassword(false);
    setEditForm({
      name: server.name,
      game: server.game,
      description: server.description ?? "",
      host: server.host,
      port: server.port ?? "",
      password: server.password ?? "",
      connectInfo: server.connectInfo ?? "",
      ampInstanceId: server.ampInstanceId ?? "",
      maxSlots: String(server.maxSlots),
    });
  }

  async function saveEdit(id: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/servers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          game: editForm.game.trim(),
          description: editForm.description.trim() || null,
          host: editForm.host.trim(),
          port: editForm.port.trim() || null,
          password: editForm.password.trim() || null,
          connectInfo: editForm.connectInfo.trim() || null,
          ampInstanceId: editForm.ampInstanceId.trim() || null,
          maxSlots: Number(editForm.maxSlots),
        }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      const updated = await res.json();
      setServers((s) => s.map((x) => (x.id === id ? updated : x)));
      setEditingId(null);
      toast.success("Gespeichert");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(server: Server) {
    const res = await fetch(`/api/admin/servers/${server.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !server.isActive }),
    });
    if (!res.ok) { toast.error("Fehler"); return; }
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
      {/* ── Neuen Server anlegen ─────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-3" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-semibold text-white">Server anlegen</h2>
        <div className="grid grid-cols-2 gap-2">
          <input placeholder="Name (z.B. Survival #1)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <GameNameInput value={form.game} onChange={(game) => setForm({ ...form, game })}
            placeholder="Spiel (z.B. Minecraft)"
            className="bg-white/5 border border-white/10 rounded-xl py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Host / IP" value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Port (optional)" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <div className="relative">
            <input type={showPassword ? "text" : "password"} placeholder="Passwort (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-9 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} tabIndex={-1}
              aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <input type="number" min={1} placeholder="Max. Spieler" value={form.maxSlots} onChange={(e) => setForm({ ...form, maxSlots: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Beschreibung (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Connect-Link (z.B. steam://connect/host:port) oder Zusatzinfo" value={form.connectInfo} onChange={(e) => setForm((f) => withConnectLinkAutoFill(f, e.target.value))}
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="AMP Instance-ID (optional, für Live-Status)" value={form.ampInstanceId} onChange={(e) => setForm({ ...form, ampInstanceId: e.target.value })}
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
        </div>
        <button onClick={createServer} disabled={saving || !form.name.trim() || !form.game.trim() || !form.host.trim()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 transition-colors">
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Server anlegen
        </button>
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate flex items-center gap-1.5">
                    <Circle className="w-2 h-2 shrink-0" style={{ color: LIGHT_COLOR[server.light], fill: LIGHT_COLOR[server.light] }} />
                    {server.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {server.game} · {server.occupied}/{server.maxSlots} Plätze belegt
                    {server.pendingCount > 0 && (
                      <span className="text-amber-400"> · {server.pendingCount} offene Bewerbung{server.pendingCount === 1 ? "" : "en"}</span>
                    )}
                  </p>
                </div>
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
                    className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors" title="Bearbeiten">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(server)} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors" title={server.isActive ? "Deaktivieren" : "Aktivieren"}>
                    {server.isActive ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteServer(server)} className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {editingId === server.id && (
                <div className="px-4 pb-4 border-t border-white/[0.05] pt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <GameNameInput value={editForm.game} onChange={(game) => setEditForm({ ...editForm, game })}
                      placeholder="Spiel"
                      className="bg-white/5 border border-white/10 rounded-lg py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Host / IP" value={editForm.host} onChange={(e) => setEditForm({ ...editForm, host: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Port" value={editForm.port} onChange={(e) => setEditForm({ ...editForm, port: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <div className="relative">
                      <input type={showEditPassword ? "text" : "password"} placeholder="Passwort" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                        className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-9 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                      <button type="button" onClick={() => setShowEditPassword((v) => !v)} tabIndex={-1}
                        aria-label={showEditPassword ? "Passwort verbergen" : "Passwort anzeigen"}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                        {showEditPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <input type="number" min={1} placeholder="Max. Spieler" value={editForm.maxSlots} onChange={(e) => setEditForm({ ...editForm, maxSlots: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Beschreibung" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Connect-Link (steam://connect/host:port) oder Zusatzinfo" value={editForm.connectInfo} onChange={(e) => setEditForm((f) => withConnectLinkAutoFill(f, e.target.value))}
                      className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="AMP Instance-ID (optional, für Live-Status)" value={editForm.ampInstanceId} onChange={(e) => setEditForm({ ...editForm, ampInstanceId: e.target.value })}
                      className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                  </div>
                  <button onClick={() => saveEdit(server.id)} disabled={saving}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 transition-colors">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Speichern
                  </button>
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
