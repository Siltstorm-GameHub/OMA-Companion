import Image from "next/image";
import PlaceMedal from "@/components/PlaceMedal";
import RankPointsIcon from "@/components/RankPointsIcon";
import { Tv2 } from "@/components/icons";

type StreamingPartner = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string } };

/** Zusatzzeile der Reihen-Kacheln: Streaming-Partner und Siegprämie (Platz 1). */
export default function SeriesEventExtras({
  partners, placementRewardsJson,
}: {
  partners: StreamingPartner[];
  placementRewardsJson: string | null;
}) {
  let firstPlace: { coins: number; rankPoints: number } | null = null;
  if (placementRewardsJson) {
    try {
      const data = JSON.parse(placementRewardsJson) as { placements?: { place: number; coins: number; rankPoints: number }[] };
      firstPlace = data.placements?.find(p => p.place === 1) ?? null;
    } catch { /* kaputtes JSON → keine Prämie anzeigen */ }
  }
  if (partners.length === 0 && !(firstPlace && (firstPlace.coins > 0 || firstPlace.rankPoints > 0))) return null;

  return (
    <>
      {partners.length > 0 && <Tv2 className="w-3 h-3 text-[#9146ff] shrink-0" aria-label="Wird gestreamt von" />}
      {partners.map(sp => (
        <a key={sp.partner.id} href={`https://twitch.tv/${sp.partner.twitchLogin}`} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-lg font-medium hover:brightness-110 transition-all"
          style={{ background: "rgba(145,70,255,0.12)", border: "1px solid rgba(145,70,255,0.25)", color: "#c4a3ff" }}>
          <Image src={sp.partner.logoUrl} alt="" width={12} height={12} className="rounded-full shrink-0" />
          {sp.partner.name}
        </a>
      ))}
      {firstPlace && (firstPlace.coins > 0 || firstPlace.rankPoints > 0) && (
        <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300" title="Prämie für Platz 1">
          <PlaceMedal place={1} />
          {firstPlace.coins > 0 && (
            <>
              <Image src="/Muenze Icon.png" alt="Münzen" width={10} height={10} className="object-contain" />
              {firstPlace.coins}
            </>
          )}
          {firstPlace.rankPoints > 0 && (
            <>
              {firstPlace.coins > 0 && <span className="text-amber-500/60">·</span>}
              <RankPointsIcon size={10} />
              {firstPlace.rankPoints}
            </>
          )}
        </span>
      )}
    </>
  );
}
