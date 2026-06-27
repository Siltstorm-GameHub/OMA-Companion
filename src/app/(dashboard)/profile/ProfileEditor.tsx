"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Check, X, Cake, MessageSquare, Loader2, Tv2 } from "lucide-react";

interface Props {
  birthday:    string | null;
  bio:         string | null;
  twitchLogin: string | null;
}

const MAX_BIO = 200;

// Lesbares Datum aus "TT-MM"
function formatBirthday(ddmm: string | null) {
  if (!ddmm) return null;
  const [d, m] = ddmm.split("-");
  const months = ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"];
  return `${parseInt(d)}. ${months[parseInt(m) - 1]}`;
}

export default function ProfileEditor({ birthday: initBirthday, bio: initBio, twitchLogin: initTwitch }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const [birthday,    setBirthday]    = useState(initBirthday ?? "");
  const [bio,         setBio]         = useState(initBio ?? "");
  const [twitchInput, setTwitchInput] = useState(initTwitch ?? "");
  const [saving,      setSaving]      = useState(false);

  const [savedBirthday, setSavedBirthday] = useState(initBirthday);
  const [savedBio,      setSavedBio]      = useState(initBio);
  const [savedTwitch,   setSavedTwitch]   = useState(initTwitch);

  async function save() {
    setSaving(true);
    try {
      const bdVal = birthday.trim() || null;
      if (bdVal && !/^\d{2}-\d{2}$/.test(bdVal)) {
        toast.error("Geburtstag bitte im Format TT-MM eingeben, z.B. 24-03");
        return;
      }

      const twitchVal = twitchInput.trim().toLowerCase() || null;

      const [r1, r2, r3] = await Promise.all([
        fetch("/api/profile/birthday", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ birthday: bdVal }),
        }),
        fetch("/api/profile/bio", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ bio: bio.trim() || null }),
        }),
        fetch("/api/profile/twitch", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ twitchLogin: twitchVal }),
        }),
      ]);

      if (!r1.ok || !r2.ok) { toast.error("Fehler beim Speichern"); return; }
      if (!r3.ok) {
        const err = await r3.json();
        toast.error(err.error ?? "Twitch-Kanal nicht gefunden");
        return;
      }

      setSavedBirthday(bdVal);
      setSavedBio(bio.trim() || null);
      setSavedTwitch(twitchVal);
      setOpen(false);
      toast.success("Profil gespeichert");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setBirthday(savedBirthday ?? "");
    setBio(savedBio ?? "");
    setTwitchInput(savedTwitch ?? "");
    setOpen(false);
  }

  return (
    <div>
      {/* ── Anzeige ──────────────────────────────────────────────────── */}
      {!open && (
        <div className="flex flex-col gap-2">
          {savedBio ? (
            <p className="text-sm text-gray-300 italic leading-relaxed">"{savedBio}"</p>
          ) : (
            <p className="text-xs text-gray-600 italic">Noch kein Gruß hinterlegt</p>
          )}

          <div className="flex items-center gap-4 flex-wrap">
            {savedBirthday ? (
              <span className="flex items-center gap-1.5 text-xs text-gray-400">
                <Cake className="w-3.5 h-3.5 text-pink-400" />
                {formatBirthday(savedBirthday)}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <Cake className="w-3.5 h-3.5" />
                Kein Geburtstag eingetragen
              </span>
            )}
            {savedTwitch ? (
              <a href={`https://twitch.tv/${savedTwitch}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-[#9146ff] hover:text-purple-300 transition-colors">
                <Tv2 className="w-3.5 h-3.5" />
                twitch.tv/{savedTwitch}
              </a>
            ) : (
              <span className="flex items-center gap-1.5 text-xs text-gray-600">
                <Tv2 className="w-3.5 h-3.5" />
                Kein Twitch verknüpft
              </span>
            )}
            <button
              onClick={() => setOpen(true)}
              className="flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white hover:border-white/[0.18] transition-colors"
            >
              <Pencil className="w-3 h-3" /> Profil bearbeiten
            </button>
          </div>
        </div>
      )}

      {/* ── Formular ─────────────────────────────────────────────────── */}
      {open && (
        <div className="glass rounded-2xl p-4 border border-indigo-500/20 space-y-4">
          <p className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">Profil bearbeiten</p>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <MessageSquare className="w-3.5 h-3.5" /> Gruß / Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value.slice(0, MAX_BIO))}
              rows={3}
              placeholder="Schreib einen kurzen Gruß für alle, die dein Profil besuchen..."
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white resize-none outline-none bg-white/[0.05] border border-white/[0.1] focus:border-indigo-500/40 placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-600 text-right">{bio.length}/{MAX_BIO}</p>
          </div>

          {/* Geburtstag */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <Cake className="w-3.5 h-3.5" /> Geburtstag
            </label>
            <input
              type="text"
              value={birthday}
              onChange={e => setBirthday(e.target.value)}
              placeholder="TT-MM  (z.B. 24-03 für 24. März)"
              maxLength={5}
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-white/[0.05] border border-white/[0.1] focus:border-pink-500/40 placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-600">
              Format: Tag-Monat · Jahreszahl wird nicht gespeichert · Du bekommst am Geburtstag einen Münzen-Boost 🎂
            </p>
          </div>

          {/* Twitch */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-xs text-gray-400">
              <Tv2 className="w-3.5 h-3.5 text-[#9146ff]" /> Twitch-Kanal verknüpfen
            </label>
            <input
              type="text"
              value={twitchInput}
              onChange={e => setTwitchInput(e.target.value)}
              placeholder="Dein Twitch-Loginname (z.B. ninja)"
              className="w-full rounded-xl px-3 py-2.5 text-sm text-white outline-none bg-white/[0.05] border border-white/[0.1] focus:border-purple-500/40 placeholder-gray-600"
            />
            <p className="text-[10px] text-gray-600">
              Wenn du live bist, erscheinst du im "Community streamt gerade"-Widget auf dem Dashboard.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button onClick={cancel}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/[0.08] text-gray-500 hover:text-white transition-colors">
              <X className="w-3 h-3" /> Abbrechen
            </button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-1.5 text-xs px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors disabled:opacity-50">
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Speichern
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
