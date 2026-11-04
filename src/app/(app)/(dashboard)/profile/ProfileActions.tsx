"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LifeBuoy, Star, Newspaper, UserPlus, Swords, Plus, Trash2 } from "@/components/icons";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { RatingForm } from "../community-board/CoachRatingSection";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
  return data as T;
}

const TEXTAREA = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40 resize-none";
const HELP_MAX = 500;
const QUESTIONS_MAX = 10;

/**
 * Aktionen auf fremden Profilen, passend zur Person:
 *  - Coach (Spezialgebiete, verfügbar oder zuletzt als Coach aktiv): "Hilfe anfragen" + "Bewerten"
 *  - "Interview anfragen" (offene Community-Jobs: jeder darf als Journalist arbeiten)
 *  - "Zu Squad hinzufügen", wenn der Betrachter Captain eines Squads ist, in dem die Person noch fehlt
 *  - "Mit mir vergleichen"
 */
export default function ProfileActions({ userId, displayName, isCoach, captainSquads }: {
  userId: string; displayName: string; isCoach: boolean;
  captainSquads: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"help" | "rate" | "interview" | "squad" | null>(null);
  const [message, setMessage] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [squadId, setSquadId] = useState(captainSquads[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const close = () => setDialog(null);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try {
      await fn();
      toast.success(success);
      close();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Fehlgeschlagen");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const BTN = "inline-flex items-center gap-1.5 text-xs glass border border-white/[0.08] text-gray-300 hover:text-white hover:border-teal-500/30 px-3 py-2 rounded-xl transition-all";

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isCoach && (
          <>
            <button type="button" className={BTN} onClick={() => setDialog("help")}><LifeBuoy className="w-3.5 h-3.5 text-teal-400" /> Um Hilfe bitten</button>
            <button type="button" className={BTN} onClick={() => setDialog("rate")}><Star className="w-3.5 h-3.5 text-amber-400" /> Coach bewerten</button>
          </>
        )}
        <button type="button" className={BTN} onClick={() => setDialog("interview")}><Newspaper className="w-3.5 h-3.5 text-blue-400" /> Interview anfragen</button>
        {captainSquads.length > 0 && (
          <button type="button" className={BTN} onClick={() => setDialog("squad")}><UserPlus className="w-3.5 h-3.5 text-emerald-400" /> Zu Squad hinzufügen</button>
        )}
        <Link href={`/profile/compare/${userId}`} className={BTN}><Swords className="w-3.5 h-3.5 text-rose-400" /> Mit mir vergleichen</Link>
      </div>

      <Modal open={dialog === "help"} onClose={close} title={`${displayName} um Hilfe bitten`}>
        <div className="space-y-2">
          <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={HELP_MAX} rows={4} className={TEXTAREA}
            placeholder={`Wobei brauchst du Hilfe? ${displayName} bekommt eine Benachrichtigung.`} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-gray-600">{message.length}/{HELP_MAX} · höchstens 3 Anfragen pro Tag</span>
            <Button size="sm" loading={busy} disabled={!message.trim()}
              onClick={async () => {
                if (await run(() => api("/api/community-jobs/coach/help-requests", { method: "POST", body: JSON.stringify({ coachId: userId, message }) }),
                  "Anfrage gesendet — der Coach wird benachrichtigt")) setMessage("");
              }}>Senden</Button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === "rate"} onClose={close} title={`${displayName} als Coach bewerten`}>
        <RatingForm coachId={userId} onDone={close} onCancel={close} />
      </Modal>

      <Modal open={dialog === "interview"} onClose={close} title={`Interview mit ${displayName}`}>
        <div className="space-y-2">
          <p className="text-[11px] text-gray-500">Die Antworten landen in deinem Büro (Journalist) und lassen sich als Q&amp;A in einen Bericht einfügen.</p>
          {questions.map((q, i) => (
            <div key={i} className="flex items-center gap-2">
              <input value={q} onChange={e => setQuestions(qs => qs.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Frage ${i + 1}`} aria-label={`Frage ${i + 1}`}
                className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-gray-600" />
              {questions.length > 1 && (
                <button type="button" aria-label="Frage entfernen" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))}
                  className="text-gray-600 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          ))}
          <div className="flex items-center justify-between gap-2">
            <Button size="sm" variant="ghost" icon={<Plus className="w-3.5 h-3.5" />} disabled={questions.length >= QUESTIONS_MAX}
              onClick={() => setQuestions(qs => [...qs, ""])}>Frage hinzufügen</Button>
            <Button size="sm" loading={busy} disabled={!questions.some(q => q.trim())}
              onClick={async () => {
                if (await run(() => api("/api/community-jobs/interviews", { method: "POST", body: JSON.stringify({ intervieweeId: userId, questions: questions.filter(q => q.trim()) }) }),
                  "Interview-Anfrage gesendet")) setQuestions([""]);
              }}>Anfragen</Button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === "squad"} onClose={close} title={`${displayName} zu einem Squad hinzufügen`}>
        <div className="space-y-3">
          <select value={squadId} onChange={e => setSquadId(e.target.value)} aria-label="Squad auswählen"
            className="w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white">
            {captainSquads.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex justify-end">
            <Button size="sm" loading={busy} disabled={!squadId}
              onClick={async () => {
                if (await run(() => api(`/api/admin/squads/${squadId}/members`, { method: "POST", body: JSON.stringify({ userId }) }),
                  `${displayName} ist jetzt im Squad`)) router.refresh();
              }}>Hinzufügen</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
