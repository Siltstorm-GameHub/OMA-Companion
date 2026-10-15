import type { OverlayClip } from "./types";

/** Reihenfolge des Community-Clip-Loops — ohne React, damit testbar. */

export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Ordnet so um, dass möglichst nie zwei Clips desselben Kanals direkt aufeinander folgen. */
export function spreadChannels<T extends Pick<OverlayClip, "channelLogin">>(clips: T[]): T[] {
  const rest = [...clips];
  const out: T[] = [];
  while (rest.length) {
    const last = out[out.length - 1]?.channelLogin;
    const i = rest.findIndex(c => c.channelLogin !== last);
    out.push(...rest.splice(i === -1 ? 0 : i, 1));
  }
  return out;
}
