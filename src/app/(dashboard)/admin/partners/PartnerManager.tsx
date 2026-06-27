"use client";
import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, ToggleLeft, ToggleRight, Loader2, Search } from "lucide-react";

type Partner = {
  id: string;
  name: string;
  twitchLogin: string;
  logoUrl: string;
  isActive: boolean;
  order: number;
};

type TwitchPreview = { login: string; display_name: string; profile_image_url: string } | null;

export default function PartnerManager({ initialPartners }: { initialPartners: Partner[] }) {
  const [partners, setPartners] = useState<Partner[]>(initialPartners);
  const [twitchInput, setTwitchInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [preview, setPreview] = useState<TwitchPreview>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function fetchPreview() {
    if (!twitchInput.trim()) return;
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await fetch(`/api/twitch/user?login=${encodeURIComponent(twitchInput.trim())}`);
      if (!res.ok) { toast.error("Twitch-Kanal nicht gefunden"); return; }
      const data = await res.json();
      setPreview(data);
      if (!nameInput) setNameInput(data.display_name);
    } catch {
      toast.error("Fehler beim Laden des Twitch-Profils");
    } finally {
      setPreviewing(false);
    }
  }

  async function addPartner() {
    if (!preview || !nameInput.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameInput.trim(),
          twitchLogin: preview.login,
          logoUrl: preview.profile_image_url,
          order: partners.length,
        }),
      });
      if (!res.ok) { toast.error("Fehler beim Speichern"); return; }
      const created = await res.json();
      setPartners((p) => [...p, created]);
      setTwitchInput("");
      setNameInput("");
      setPreview(null);
      toast.success(`${created.name} als Partner hinzugefügt`);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(partner: Partner) {
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !partner.isActive }),
    });
    if (!res.ok) { toast.error("Fehler"); return; }
    const updated = await res.json();
    setPartners((p) => p.map((x) => (x.id === partner.id ? updated : x)));
  }

  async function deletePartner(partner: Partner) {
    if (!confirm(`${partner.name} wirklich entfernen?`)) return;
    const res = await fetch(`/api/partners/${partner.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Fehler beim Löschen"); return; }
    setPartners((p) => p.filter((x) => x.id !== partner.id));
    toast.success("Partner entfernt");
  }

  return (
    <div className="space-y-6">
      {/* ── Neuen Partner hinzufügen ─────────────────────────────── */}
      <div className="glass rounded-2xl p-5 space-y-4" style={{ border: "1px solid rgba(255,255,255,0.07)" }}>
        <h2 className="text-sm font-semibold text-white">Partner hinzufügen</h2>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Twitch-Loginname (z.B. streamer123)"
            value={twitchInput}
            onChange={(e) => { setTwitchInput(e.target.value); setPreview(null); }}
            onKeyDown={(e) => e.key === "Enter" && fetchPreview()}
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
          />
          <button
            onClick={fetchPreview}
            disabled={previewing || !twitchInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium bg-white/8 border border-white/10 text-white hover:bg-white/12 disabled:opacity-40 transition-colors"
          >
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            Suchen
          </button>
        </div>

        {preview && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/8">
            <Image
              src={preview.profile_image_url}
              alt={preview.display_name}
              width={48}
              height={48}
              className="rounded-full"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">{preview.display_name}</p>
              <p className="text-xs text-gray-400">twitch.tv/{preview.login}</p>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 max-w-[200px]">
              <input
                type="text"
                placeholder="Anzeigename"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-white/20"
              />
              <button
                onClick={addPartner}
                disabled={saving || !nameInput.trim()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30 disabled:opacity-40 transition-colors"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                Hinzufügen
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Partner-Liste ────────────────────────────────────────── */}
      {partners.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">Noch keine Partner eingetragen.</p>
      ) : (
        <div className="space-y-2">
          {partners.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 px-4 py-3 rounded-xl glass"
              style={{ border: "1px solid rgba(255,255,255,0.06)", opacity: p.isActive ? 1 : 0.5 }}
            >
              <Image
                src={p.logoUrl}
                alt={p.name}
                width={36}
                height={36}
                className="rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                <p className="text-xs text-gray-500">twitch.tv/{p.twitchLogin}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <a
                  href={`https://twitch.tv/${p.twitchLogin}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => toggleActive(p)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/8 transition-colors"
                  title={p.isActive ? "Deaktivieren" : "Aktivieren"}
                >
                  {p.isActive
                    ? <ToggleRight className="w-4 h-4 text-emerald-400" />
                    : <ToggleLeft className="w-4 h-4" />
                  }
                </button>
                <button
                  onClick={() => deletePartner(p)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/8 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
