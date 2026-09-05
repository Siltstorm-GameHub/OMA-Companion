"use client";
import Image from "next/image";
import { Trophy, Medal } from "lucide-react";
import RankedAvatar from "@/components/RankedAvatar";
import { CATEGORY_CONFIG } from "@/lib/wanderpocal";
import type { MancaveData, MancaveWanderpokalStatus, MancavePokal, MancaveBadge } from "./mancave-data";
import { WANDERPOKAL_THUMBS, WANDERPOKAL_THUMB_DEFAULT } from "./MancaveSharedUI";

/**
 * Einzel-Item-Detailkomponenten für die neue Klick-Interaktion in der
 * 3D-Szene (siehe `detailItem`-State in MancaveScene3D.tsx) — ersetzen für
 * Wanderpokale/Event-Pokale/Abzeichen das alte "Klick auf Regal -> große
 * Gesamtliste"-Popup (`WanderpokalePanel`/`EventPokalePanel`/`TrophyPanel`
 * in MancaveSharedUI.tsx, die für den Monitor-Dock unverändert weiter
 * bestehen) durch eine Detail-Ansicht für genau EIN Item.
 *
 * Layout/Logik für den Wanderpokal-/Event-Pokal-Fall bewusst 1:1 aus den
 * bestehenden Listen-Panels übernommen (Thumb/Avatar/Sieg-Vergleich bzw.
 * Kategorie/Datum/Serie-Link), nur auf ein einzelnes Item verkleinert statt
 * über `.map()` eine ganze Liste zu rendern.
 */
type TrophyDetailModalProps =
  | { kind: "wanderpokal"; status: MancaveWanderpokalStatus; data: MancaveData }
  | { kind: "eventpokal"; pokal: MancavePokal };

export function TrophyDetailModal(props: TrophyDetailModalProps) {
  if (props.kind === "wanderpokal") {
    const { status: s, data } = props;
    const winLabel = (n: number) => `${n} ${n === 1 ? "Sieg" : "Siege"}`;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">{s.title}</h3>
        </div>
        <div className="flex flex-col items-center gap-3 py-2">
          <Image src={WANDERPOKAL_THUMBS[s.scopeValue] ?? WANDERPOKAL_THUMB_DEFAULT} alt="" width={96} height={96}
            className="w-24 h-24 object-contain" unoptimized />
          {s.ownedByMe ? (
            <div className="flex items-center gap-2">
              <RankedAvatar rankPoints={data.rankPoints} src={data.avatarUrl} alt="Du" size={32} rounded="full" />
              <span className="text-sm text-amber-200 font-semibold">Du · {winLabel(s.winCount ?? 0)}</span>
            </div>
          ) : s.holderUserId ? (
            <a href={`/profile/${s.holderUserId}`} className="flex items-center gap-2 hover:underline">
              <RankedAvatar rankPoints={s.holderRankPoints ?? 0} src={s.holderAvatarUrl} alt={s.holderName ?? "Halter"} size={32} rounded="full" />
              <span className="text-sm text-gray-300">{s.holderName} · {winLabel(s.winCount ?? 0)}</span>
            </a>
          ) : (
            <span className="text-sm text-gray-500">Noch nie vergeben</span>
          )}
          {!s.ownedByMe && (
            <p className="text-xs text-gray-600">Deine Siege in diesem Scope: {winLabel(s.myWinCount)}</p>
          )}
        </div>
      </div>
    );
  }

  const { pokal: p } = props;
  const cat = CATEGORY_CONFIG[p.category];
  const href = p.seriesId ? `/events/series/${p.seriesId}` : p.eventId ? `/tournament/${p.eventId}` : null;
  const date = new Date(p.awardedAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Medal className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-white">
          {p.title}{p.isSeries && <span className="text-gray-500"> (Serie)</span>}
        </h3>
      </div>
      <div className="flex flex-col items-center gap-2 py-2 text-center">
        <span className="text-4xl">{cat?.emoji ?? "🏆"}</span>
        <p className="text-xs text-gray-400">{cat?.title ?? p.category} · {date}</p>
        {href && (
          <a href={href} className="text-xs text-teal-300 hover:text-teal-200 underline underline-offset-2">
            Zum Event
          </a>
        )}
      </div>
    </div>
  );
}

export function BadgeDetailModal({ badge }: { badge: MancaveBadge }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">{badge.icon}</span>
        <h3 className="text-sm font-semibold text-white">{badge.name}</h3>
      </div>
      <div className="flex flex-col items-center gap-3 py-2 text-center">
        <span className="w-20 h-20 rounded-xl flex items-center justify-center text-5xl bg-white/[0.04] border border-white/[0.06]">
          {badge.icon}
        </span>
        <p className="text-xs text-gray-400">{badge.desc}</p>
      </div>
    </div>
  );
}
