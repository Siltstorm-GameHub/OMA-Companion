"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

type Partner = { id: string; name: string; twitchLogin: string; logoUrl: string };

export default function PartnerFooterClient({ partners }: { partners: Partner[] }) {
  const [liveLogins, setLiveLogins] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch("/api/twitch/live")
      .then((r) => r.json())
      .then((data: { twitchLogin: string }[]) => {
        setLiveLogins(new Set(data.map((s) => s.twitchLogin.toLowerCase())));
      })
      .catch(() => {});
  }, []);

  return (
    <footer className="relative z-10 px-4 sm:px-6 py-4 mt-4 mb-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest flex-shrink-0">
          Partner
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {partners.map((p) => {
            const isLive = liveLogins.has(p.twitchLogin.toLowerCase());
            return (
              <a
                key={p.id}
                href={`https://twitch.tv/${p.twitchLogin}`}
                target="_blank"
                rel="noopener noreferrer"
                title={isLive ? `${p.name} ist gerade live!` : p.name}
                className="flex items-center gap-1.5 group opacity-50 hover:opacity-90 transition-opacity"
                style={isLive ? { opacity: 1 } : undefined}
              >
                <div className="relative">
                  <Image
                    src={p.logoUrl}
                    alt={p.name}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  {isLive && (
                    <>
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-red-500" />
                    </>
                  )}
                </div>
                <span className={`text-xs transition-colors hidden sm:block ${isLive ? "text-white" : "text-gray-500 group-hover:text-gray-300"}`}>
                  {p.name}
                </span>
                {isLive && (
                  <span className="text-[9px] font-bold text-red-400 tracking-wide">LIVE</span>
                )}
              </a>
            );
          })}
        </div>
      </div>
    </footer>
  );
}
