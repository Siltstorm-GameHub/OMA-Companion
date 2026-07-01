"use client";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Pencil, Users, Circle } from "lucide-react";
import GameNameInput from "@/components/GameNameInput";
import GameCover from "@/components/GameCover";
import { parseConnectLink } from "@/lib/connect-link";

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
  maxSlots: number;
  isActive: boolean;
  occupied: number;
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
  maxSlots: string;
};

const EMPTY_FORM: FormState = { name: "", game: "", description: "", host: "", port: "", password: "", connectInfo: "", maxSlots: "10" };

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
    setEditForm({
      name: server.name,
      game: server.game,
      description: server.description ?? "",
      host: server.host,
      port: server.port ?? "",
      password: server.password ?? "",
      connectInfo: server.connectInfo ?? "",
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
    if (!confirm(`${server.name} wirklich löschen? Alle Bewerbungen werden mitgelöscht.`)) return;
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
          <input placeholder="Passwort (optional)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input type="number" min={1} placeholder="Max. Spieler" value={form.maxSlots} onChange={(e) => setForm({ ...form, maxSlots: e.target.value })}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Beschreibung (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="col-span-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20" />
          <input placeholder="Connect-Link (z.B. steam://connect/host:port) oder Zusatzinfo" value={form.connectInfo} onChange={(e) => setForm((f) => withConnectLinkAutoFill(f, e.target.value))}
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
        <p className="text-sm text-gray-500 text-center py-8">Noch keine Server eingetragen.</p>
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
                  <p className="text-xs text-gray-500">{server.game} · {server.occupied}/{server.maxSlots} Plätze belegt</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Link href={`/admin/servers/${server.id}/applications`}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Bewerbungen">
                    <Users className="w-3.5 h-3.5" />
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
                    <input placeholder="Passwort" value={editForm.password} onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input type="number" min={1} placeholder="Max. Spieler" value={editForm.maxSlots} onChange={(e) => setEditForm({ ...editForm, maxSlots: e.target.value })}
                      className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Beschreibung" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="col-span-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-white/20" />
                    <input placeholder="Connect-Link (steam://connect/host:port) oder Zusatzinfo" value={editForm.connectInfo} onChange={(e) => setEditForm((f) => withConnectLinkAutoFill(f, e.target.value))}
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
    </div>
  );
}
