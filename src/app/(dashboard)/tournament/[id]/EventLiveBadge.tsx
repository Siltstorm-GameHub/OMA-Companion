"use client";
import { useEffect, useState } from "react";
import { Radio } from "lucide-react";

export default function EventLiveBadge({ twitchLogins }: { twitchLogins: string[] }) {
  const [livePartner, setLivePartner] = useState<{ twitchLogin: string; partnerName: string } | null>(null);

  useEffect(() => {
    if (twitchLogins.length === 0) return;
    fetch("/api/twitch/live")
      .then((r) => r.json())
      .then((data: { twitchLogin: string; partnerName: string }[]) => {
        const live = data.find((s) => twitchLogins.includes(s.twitchLogin.toLowerCase()));
        if (live) setLivePartner(live);
      })
      .catch(() => {});
  }, [twitchLogins]);

  if (!livePartner) return null;

  return (
    <a
      href={`https://twitch.tv/${livePartner.twitchLogin}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:brightness-110"
      style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.3)", color: "#c4a3ff" }}
    >
      <div className="relative flex-shrink-0">
        <Radio className="w-3 h-3" />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#9146ff] animate-ping" />
        <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#9146ff]" />
      </div>
      {livePartner.partnerName} streamt gerade ↗
    </a>
  );
}
