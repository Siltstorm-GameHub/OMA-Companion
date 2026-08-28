"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ChevronLeft, Save, Trash2, Eye, EyeOff } from "lucide-react";
import SeriesIcon from "@/components/SeriesIcon";
import { SERIES_ICONS } from "@/lib/series-icons";
import { useConfirm } from "@/components/admin/ConfirmDialog";
import SquadRosterManager from "@/components/squads/SquadRosterManager";
import ImageUploadField from "@/components/ImageUploadField";

type User = { id: string; name: string | null; username: string | null; image: string | null };
type Membership = { id: string; userId: string; role: string; user: User };
type Squad = {
  id: string; name: string; game: string | null; description: string | null;
  icon: string | null; coverImageUrl: string | null; hidden: boolean; memberships: Membership[];
};

const inputCls = "w-full rounded-lg px-3 py-2 text-sm text-white outline-none bg-gray-800 border border-gray-700 focus:border-teal-500/50 transition-colors";

export default function SquadDetailClient({
  squad, allUsers, isAdmin,
}: {
  squad: Squad;
  allUsers: User[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const { confirm, ConfirmDialogElement } = useConfirm();
  const [loading, setLoading] = useState(false);

  /* ── Stammdaten (nur Admin) ── */
  const [name, setName]               = useState(squad.name);
  const [game, setGame]               = useState(squad.game ?? "");
  const [description, setDescription] = useState(squad.description ?? "");
  const [icon, setIcon]               = useState(squad.icon ?? "");
  const [coverImageUrl, setCoverImageUrl] = useState(squad.coverImageUrl ?? "");
  const [hidden, setHidden]           = useState(squad.hidden);
  const [saving, setSaving]           = useState(false);

  async function saveSquad() {
    setSaving(true);
    const res = await fetch(`/api/admin/squads/${squad.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, game: game || null, description: description || null, icon: icon || null, coverImageUrl: coverImageUrl || null, hidden }),
    });
    setSaving(false);
    if (res.ok) { toast.success("Gespeichert"); router.refresh(); }
    else { const e = await res.json().catch(() => ({})); toast.error(e.error ?? "Fehler beim Speichern"); }
  }

  async function deleteSquad() {
    if (!(await confirm({
      title: "Squad löschen",
      description: `„${squad.name}" wirklich löschen? Alle Mitgliedschaften werden entfernt. Events, die diesem Squad zugeordnet sind, bleiben bestehen, verlieren aber die Team-Beschränkung.`,
      variant: "danger",
    }))) return;
    setLoading(true);
    const res = await fetch(`/api/admin/squads/${squad.id}`, { method: "DELETE" });
    setLoading(false);
    if (res.ok) { toast.success("Squad gelöscht"); router.push("/admin/squads"); }
    else toast.error("Fehler beim Löschen");
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogElement}

      {/* Breadcrumb */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <Link href="/admin/squads" className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          <ChevronLeft className="w-4 h-4" /> Squads
        </Link>
        {isAdmin && (
          <button onClick={deleteSquad} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-400 hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Squad löschen
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <SeriesIcon name={squad.icon} className="w-7 h-7 shrink-0" />
        <div>
          <h1 className="text-xl font-black text-white">{squad.name}</h1>
          {squad.game && <p className="text-sm text-gray-500">{squad.game}</p>}
        </div>
        {squad.hidden && (
          <span className="flex items-center gap-1 text-[10px] text-gray-500 ml-auto">
            <EyeOff className="w-3 h-3" /> ausgeblendet
          </span>
        )}
      </div>

      {/* Stammdaten (nur Admin) */}
      {isAdmin && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">Stammdaten</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Spiel (optional)</label>
              <input type="text" value={game} onChange={e => setGame(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Beschreibung (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Icon</label>
            <div className="grid grid-cols-8 sm:grid-cols-12 gap-2">
              {SERIES_ICONS.map(i => {
                const Icon = i.icon;
                const selected = icon === i.value;
                return (
                  <button key={i.value} type="button" title={i.label}
                    onClick={() => setIcon(selected ? "" : i.value)}
                    className="flex items-center justify-center rounded-xl p-2 border transition-all"
                    style={selected
                      ? { borderColor: `${i.color}99`, background: `${i.color}1a` }
                      : { borderColor: "rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)" }}>
                    <Icon className="w-4 h-4" style={{ color: selected ? i.color : "#9ca3af" }} />
                  </button>
                );
              })}
            </div>
          </div>
          <ImageUploadField
            value={coverImageUrl}
            onChange={setCoverImageUrl}
            kind="event-cover"
            label="Squad-Cover (optional)"
            hint="Team-Foto oder Banner — erscheint auf der Dashboard-Kachel und der öffentlichen Squad-Seite. Ohne Cover zeigt die Kachel das Icon. Empfohlen: 1200×630."
            previewAspect="1200/630"
          />
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={hidden} onChange={e => setHidden(e.target.checked)}
              className="w-4 h-4 rounded accent-violet-500" />
            <span className="text-xs text-gray-300 flex items-center gap-1">
              {hidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              Ausgeblendet (nur im Admin sichtbar, keine öffentliche Squad-Seite)
            </span>
          </label>
          <button onClick={saveSquad} disabled={saving || !name.trim()}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white bg-teal-700 hover:bg-teal-600 transition-colors disabled:opacity-50">
            <Save className="w-4 h-4" /> {saving ? "Wird gespeichert…" : "Speichern"}
          </button>
        </div>
      )}

      {/* Roster */}
      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3">
        <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest">
          Roster ({squad.memberships.length})
        </p>
        <SquadRosterManager squadId={squad.id} memberships={squad.memberships} allUsers={allUsers} />
      </div>
    </div>
  );
}
