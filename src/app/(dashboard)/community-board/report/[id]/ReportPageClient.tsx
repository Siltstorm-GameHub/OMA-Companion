"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "lucide-react";
import { FeedCard, type FeedEntry } from "../../CommunityBoardClient";

export default function ReportPageClient({ entry, isDraft }: { entry: FeedEntry; isDraft: boolean }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  const [isJournalist, setIsJournalist] = useState(false);

  useEffect(() => {
    // Nur aktive Journalisten sehen "Bericht ergänzen".
    fetch("/api/community-jobs").then(r => r.json())
      .then((d: { activeMembership: { jobKey: string } | null }) => setIsJournalist(d.activeMembership?.jobKey === "journalist"))
      .catch(() => {});
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
      <Link href="/community-board" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-300 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Zurück zum Community-Board
      </Link>
      {isDraft && <p className="text-xs text-amber-400">Entwurf — nur für dich sichtbar, noch nicht veröffentlicht.</p>}
      {/* Nach Ergänzen/Bewerten die Serverdaten neu laden. */}
      <FeedCard entry={entry} currentUserId={currentUserId} isJournalist={isJournalist} onChanged={() => router.refresh()} expandReport />
    </div>
  );
}
