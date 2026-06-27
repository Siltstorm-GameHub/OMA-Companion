"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Radio, Eye } from "lucide-react";

type LiveStream = {
  user_login: string;
  user_name: string;
  partnerName: string;
  logoUrl: string;
  title: string;
  game_name: string;
  viewer_count: number;
  thumbnail_url: string;
};

export default function PartnerLiveBanner() {
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/twitch/live")
      .then((r) => r.json())
      .then((data: LiveStream[]) => { setStreams(data); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded || streams.length === 0) return null;

  return (
    <div className="px-4 sm:px-6 pt-4 max-w-7xl mx-auto">
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(145,70,255,0.2)", background: "rgba(145,70,255,0.04)" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
          <div className="relative flex-shrink-0">
            <Radio className="w-3.5 h-3.5 text-[#9146ff]" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#9146ff] animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#9146ff]" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#9146ff]/70">
            Partner streamen gerade
          </span>
          <span className="ml-auto text-[10px] text-gray-600">{streams.length} live</span>
        </div>

        {/* Stream-Karten */}
        <div className={`grid gap-2 px-3 pb-3 ${streams.length === 1 ? "grid-cols-1 max-w-xs" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"}`}>
          {streams.slice(0, 4).map((s) => (
            <a
              key={s.user_login}
              href={`https://twitch.tv/${s.user_login}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col rounded-xl overflow-hidden hover:brightness-110 transition-all"
              style={{ border: "1px solid rgba(255,255,255,0.06)", background: "rgba(0,0,0,0.3)" }}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-black overflow-hidden">
                <Image
                  src={s.thumbnail_url}
                  alt={s.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
                {/* LIVE Badge */}
                <span className="absolute top-1.5 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-600 text-white tracking-wide">
                  LIVE
                </span>
                {/* Viewer count */}
                <span className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 text-[10px] text-white font-medium px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.6)" }}>
                  <Eye className="w-2.5 h-2.5" />
                  {s.viewer_count.toLocaleString("de-DE")}
                </span>
              </div>

              {/* Info */}
              <div className="px-2.5 py-2 flex items-start gap-2">
                {s.logoUrl && (
                  <Image
                    src={s.logoUrl}
                    alt={s.partnerName}
                    width={20}
                    height={20}
                    className="rounded-full flex-shrink-0 mt-0.5"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-white truncate">{s.partnerName}</p>
                  <p className="text-[10px] text-gray-400 truncate leading-tight">{s.title}</p>
                  <p className="text-[10px] text-gray-600 truncate">{s.game_name}</p>
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
