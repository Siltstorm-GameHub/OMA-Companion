import { Trophy } from "lucide-react";
import TwitchClipEmbed from "@/components/TwitchClipEmbed";
import { clipCredit } from "@/lib/clip-display";

type WinnerNomination = {
  id: string;
  clipUrl: string;
  thumbnailUrl: string | null;
  clipTitle: string | null;
  submittedBy?: { name: string | null; username: string | null } | null;
  twitchCreatorLogin: string | null;
  partnerTwitchLogin: string | null;
};

interface Props {
  winner: WinnerNomination;
  embedParent: string;
  rewardCoins?: number;
  badgeLabel?: string;
}

export default function ClipWinnerCard({ winner, embedParent, rewardCoins, badgeLabel = "Gewinner" }: Props) {
  const credit = clipCredit(winner);
  return (
    <div className="rounded-2xl overflow-hidden border border-amber-500/20 bg-amber-500/5">
      <TwitchClipEmbed
        clipUrl={winner.clipUrl}
        thumbnailUrl={winner.thumbnailUrl}
        title={winner.clipTitle ?? "Gewinner-Clip"}
        parent={embedParent}
        overlay={
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-amber-500 text-black text-xs font-bold px-2 py-1 rounded-full">
            <Trophy className="w-3 h-3" /> {badgeLabel}
          </div>
        }
      />
      <div className="px-4 py-3 border-t border-amber-500/10">
        <p className="text-white font-semibold">{winner.clipTitle ?? "Unbekannter Clip"}</p>
        <p className="text-sm text-gray-400 mt-0.5">
          Kanal: <span className="text-[#9146ff]">{credit.channel}</span>
          {credit.creator && (
            <> · Clip von <span className="text-amber-300">{credit.creator}</span></>
          )}
          {!!rewardCoins && (
            <> · <span className="text-amber-400">{rewardCoins} Münzen</span> gewonnen</>
          )}
        </p>
      </div>
    </div>
  );
}
