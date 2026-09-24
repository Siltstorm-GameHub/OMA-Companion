"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import IdeaForm, { type IdeaPrefill } from "./IdeaForm";

/** "Idee dazu": nur für aktive Visionäre sichtbar; öffnet das Ideen-Formular mit Verknüpfung zum Event bzw. Bericht. */

let membershipPromise: Promise<boolean> | null = null;
function isVisionaer(): Promise<boolean> {
  membershipPromise ??= fetch("/api/community-jobs").then(r => r.json())
    .then((d: { activeMembership: { jobKey: string } | null }) => d.activeMembership?.jobKey === "visionaer")
    .catch(() => false);
  return membershipPromise;
}

export default function IdeaFromButton({ prefill, label = "Idee dazu" }: { prefill: IdeaPrefill; label?: string }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => { isVisionaer().then(setAllowed); }, []);
  if (!allowed) return null;

  return (
    <>
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-amber-400 transition-colors">
        <Lightbulb className="w-3 h-3" /> {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Idee einreichen" size="lg">
        <IdeaForm prefill={prefill} onDone={() => { setOpen(false); router.refresh(); }} />
      </Modal>
    </>
  );
}
