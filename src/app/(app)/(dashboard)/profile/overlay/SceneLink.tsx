"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Tv2, Copy, Check, ExternalLink, Move } from "@/components/icons";

/** OBS übernimmt beim Hineinziehen eines Links diese Parameter für die neue Browser-Quelle
 *  (Name und Größe) — die Overlay-Seite selbst ignoriert sie. */
export function obsDragUrl(url: string, name: string, size: { width: number; height: number } = { width: 1920, height: 1080 }) {
  const u = new URL(url);
  u.searchParams.set("layer-name", name);
  u.searchParams.set("layer-width", String(size.width));
  u.searchParams.set("layer-height", String(size.height));
  return u.toString();
}

/** Eine Szene: ziehbarer Griff (für OBS), Link, Kopieren und Vorschau. */
export default function SceneLink({
  icon: Icon, label, hint, url, dragUrl,
}: { icon: typeof Tv2; label: string; hint: string; url: string; dragUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link kopiert");
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.message(label, { description: url });
    }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 text-sm text-gray-200 font-medium mb-1.5">
        <Icon className="w-3.5 h-3.5 text-teal-300" /> {label}
        <span className="text-xs text-gray-500 font-normal">· {hint}</span>
      </div>
      <div className="flex items-center gap-2">
        {/* Normaler Link, damit OBS beim Hineinziehen eine Browser-Quelle anlegt. Ein Klick tut
           bewusst nichts (die Vorschau hat einen eigenen Knopf), sonst landet man im Overlay. */}
        <a
          href={dragUrl}
          draggable
          onClick={e => e.preventDefault()}
          title="In OBS ziehen"
          className="shrink-0 flex items-center gap-1.5 text-xs px-2.5 py-2.5 rounded-lg border border-dashed border-teal-500/40 text-teal-300 cursor-grab active:cursor-grabbing hover:bg-teal-500/10"
        >
          <Move className="w-3.5 h-3.5" /> In OBS ziehen
        </a>
        <code className="flex-1 min-w-0 text-xs text-gray-300 bg-black/40 border border-white/[0.08] rounded-lg px-3 py-2.5 overflow-x-auto whitespace-nowrap">
          {url}
        </code>
        <button
          onClick={copy}
          title="Kopieren"
          className="shrink-0 flex items-center gap-1.5 text-sm px-3 py-2.5 rounded-lg bg-teal-500/15 border border-teal-500/40 text-teal-300 hover:bg-teal-500/25 transition-all font-medium"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          title="Vorschau in neuem Tab"
          className="shrink-0 flex items-center px-2.5 py-2.5 rounded-lg border border-white/[0.08] text-gray-400 hover:text-teal-300"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
