"use client";
import { useState } from "react";
import { Play, Clapperboard } from "lucide-react";
import { extractTwitchClipSlug } from "@/lib/clip-display";

interface Props {
  clipUrl: string;
  thumbnailUrl: string | null;
  title: string;
  parent: string;
  overlay?: React.ReactNode;
}

export default function TwitchClipEmbed({ clipUrl, thumbnailUrl, title, parent, overlay }: Props) {
  const [playing, setPlaying] = useState(false);
  const slug = extractTwitchClipSlug(clipUrl);

  if (playing && slug) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={`https://clips.twitch.tv/embed?clip=${slug}&parent=${parent}&autoplay=true`}
          allow="autoplay; fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => slug ? setPlaying(true) : window.open(clipUrl, "_blank", "noopener,noreferrer")}
      className="relative aspect-video w-full block group bg-white/[0.03]"
    >
      {thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={thumbnailUrl.replace("%{width}", "640").replace("%{height}", "360")}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Clapperboard className="w-10 h-10 text-gray-700" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
          <Play className="w-5 h-5 text-black ml-0.5" fill="black" />
        </div>
      </div>
      {overlay}
    </button>
  );
}
