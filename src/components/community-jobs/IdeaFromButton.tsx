"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Lightbulb } from "@/components/icons";
import { Modal } from "@/components/ui/Modal";
import IdeaForm, { type IdeaPrefill } from "./IdeaForm";

/** "Idee dazu": für alle eingeloggten User (offene Community-Jobs); öffnet das Ideen-Formular mit Verknüpfung zum Event bzw. Bericht. */

export default function IdeaFromButton({ prefill, label = "Idee dazu" }: { prefill: IdeaPrefill; label?: string }) {
  const router = useRouter();
  const { status } = useSession();
  const [open, setOpen] = useState(false);

  if (status !== "authenticated") return null;

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
