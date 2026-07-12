"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Tv2, Eye, ExternalLink } from "lucide-react";
import TwitchEmbedPlayer from "./TwitchEmbedPlayer";

type LiveMember = {
  user_login: string;
  userId: string;
  displayName: string;
  avatar: string;
  title: string;
  game_name: string;
  viewer_count: number;
  thumbnail_url: string;
};

export default function CommunityLiveBanner() {
  const [streams, setStreams] = useState<LiveMember[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/twitch/community-live")
      .then((r) => r.json())
      .then((data: LiveMember[]) => { setStreams(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || streams.length === 0) return null;

  const activeStream = streams.find((s) => s.user_login === activeChannel);

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(20,211,150,0.15)", background: "rgba(20,211,150,0.03)" }}>
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
          <div className="relative flex-shrink-0">
            <Tv2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="live-ring absolute -top-0.5 -right-0.5 w-1.5 h-1.5">
              <span className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-400/70">
            Community streamt gerade
          </span>
          <span className="ml-auto text-[10px] text-gray-600">{streams.length} live</span>
        </div>

        {activeStream && (
          <div className="px-3 pb-3">
            <TwitchEmbedPlayer channel={activeStream.user_login} onClose={() => setActiveChannel(null)} />
          </div>
        )}

        <div className={`grid gap-2 px-3 pb-3 ${streams.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {streams.slice(0, 4).map((s) => (
            <button
              key={s.user_login}
              onClick={() => setActiveChannel(s.user_login)}
              className="group flex flex-col text-left rounded-xl overflow-hidden hover:brightness-110 transition-all"
              style={{
                border: activeChannel === s.user_login ? "1px solid rgba(20,211,150,0.6)" : "1px solid rgba(255,255,255,0.06)",
                background: "rgba(0,0,0,0.3)",
              }}
            >
              <div className="relative aspect-video bg-black overflow-hidden">
                <Image src={s.thumbnail_url} alt={s.title} fill className="object-cover" unoptimized />
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wide">LIVE</span>
                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-[10px] text-white font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)" }}>
                  <Eye className="w-2.5 h-2.5" />{s.viewer_count.toLocaleString("de-DE")}
                </span>
                <span className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                  <span className="w-8 h-8 rounded-full bg-white/0 group-hover:bg-white/90 flex items-center justify-center transition-colors">
                    <span className="w-0 h-0 border-y-[6px] border-y-transparent border-l-[9px] border-l-transparent group-hover:border-l-emerald-500 ml-0.5" />
                  </span>
                </span>
              </div>
              <div className="px-2.5 py-2 flex items-start gap-2">
                {s.avatar && (
                  <Image src={s.avatar} alt={s.displayName} width={20} height={20} className="rounded-full flex-shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold text-white truncate">{s.displayName}</p>
                  <p className="text-[10px] text-gray-400 truncate leading-tight">{s.title}</p>
                  <p className="text-[10px] text-gray-600 truncate">{s.game_name}</p>
                </div>
                <a
                  href={`https://twitch.tv/${s.user_login}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Auf Twitch öffnen"
                  className="flex-shrink-0 text-gray-600 hover:text-emerald-400 transition-colors mt-0.5"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
