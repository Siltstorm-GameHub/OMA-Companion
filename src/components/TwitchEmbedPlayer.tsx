"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";

export default function TwitchEmbedPlayer({
  channel,
  onClose,
}: {
  channel: string;
  onClose: () => void;
}) {
  const [parent, setParent] = useState<string | null>(null);

  useEffect(() => {
    setParent(window.location.hostname);
  }, []);

  return (
    <div className="relative rounded-xl overflow-hidden bg-black" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
      <button
        onClick={onClose}
        aria-label="Stream schließen"
        className="absolute top-2 right-2 z-10 flex items-center justify-center w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="aspect-video">
        {parent && (
          <iframe
            src={`https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${parent}&autoplay=true&muted=false`}
            className="w-full h-full"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        )}
      </div>
    </div>
  );
}
