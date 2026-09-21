"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import MarkdownLite from "@/components/community-jobs/MarkdownLite";

interface JobTexts {
  key: string; label: string; emoji: string;
  defaults: { description: string; officeGuideMarkdown: string };
  overrides: { description?: string; officeGuideMarkdown?: string };
}

const FIELD = "w-full bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-teal-500/40";

function JobTextEditor({ job, onSaved }: { job: JobTexts; onSaved: () => void }) {
  const [description, setDescription] = useState(job.overrides.description ?? "");
  const [guide, setGuide] = useState(job.overrides.officeGuideMarkdown ?? "");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const changed = description !== (job.overrides.description ?? "") || guide !== (job.overrides.officeGuideMarkdown ?? "");

  async function save() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/community-jobs/texts", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobKey: job.key, description: description.trim() || null, officeGuideMarkdown: guide.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Fehlgeschlagen");
      toast.success("Gespeichert");
      onSaved();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Fehlgeschlagen"); }
    finally { setBusy(false); }
  }

  return (
    <div className="glass rounded-xl p-3 space-y-2.5">
      <p className="text-sm text-white font-semibold">{job.emoji} {job.label}</p>
      <label className="block space-y-1">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Beschreibung</span>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} maxLength={4000} placeholder={job.defaults.description} className={`${FIELD} resize-y`} />
      </label>
      <label className="block space-y-1">
        <span className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-widest">Büro-Anleitung (Markdown)</span>
          <button type="button" onClick={() => setPreview(v => !v)} className="text-[10px] text-gray-500 hover:text-teal-400 transition-colors">{preview ? "Bearbeiten" : "Vorschau"}</button>
        </span>
        {preview
          ? <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3"><MarkdownLite text={guide.trim() || job.defaults.officeGuideMarkdown} className="text-xs text-gray-400" /></div>
          : <textarea value={guide} onChange={e => setGuide(e.target.value)} rows={5} maxLength={4000} placeholder={job.defaults.officeGuideMarkdown} className={`${FIELD} resize-y`} />}
      </label>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] text-gray-600">{job.overrides.description || job.overrides.officeGuideMarkdown ? "Angepasste Texte aktiv." : "Es gelten die Standardtexte."}</p>
        <div className="flex gap-1.5">
          {(description || guide) && <Button size="sm" variant="ghost" onClick={() => { setDescription(""); setGuide(""); }}>Auf Standard</Button>}
          <Button size="sm" loading={busy} disabled={!changed} onClick={save}>Speichern</Button>
        </div>
      </div>
    </div>
  );
}

export default function TextsClient() {
  const [jobs, setJobs] = useState<JobTexts[] | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    fetch("/api/admin/community-jobs/texts").then(r => (r.ok ? r.json() : Promise.reject())).then((d: { jobs: JobTexts[] }) => setJobs(d.jobs)).catch(() => setJobs([]));
  }, [tick]);

  if (!jobs) return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-teal-400 animate-spin" /></div>;
  return (
    <div className="space-y-3">
      {jobs.map(j => <JobTextEditor key={`${j.key}-${tick}`} job={j} onSaved={() => setTick(t => t + 1)} />)}
    </div>
  );
}
