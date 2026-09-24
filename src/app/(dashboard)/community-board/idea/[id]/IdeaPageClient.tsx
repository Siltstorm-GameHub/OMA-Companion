"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft } from "@/components/icons";
import { FeedCard, type FeedEntry } from "../../CommunityBoardClient";

export default function IdeaPageClient({ entry }: { entry: FeedEntry }) {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  return (
    <div className="max-w-2xl mx-auto space-y-4 px-4 py-6">
      <Link href="/community-board" className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-teal-300 transition-colors">
        <ChevronLeft className="w-3.5 h-3.5" /> Zurück zum Community-Board
      </Link>
      {/* Nach Bewerten/Status ändern die Serverdaten neu laden. */}
      <FeedCard entry={entry} currentUserId={currentUserId} isJournalist={false} onChanged={() => router.refresh()} expandReport />
    </div>
  );
}
