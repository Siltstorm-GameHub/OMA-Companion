import Image from "next/image";
import PlaceMedal from "@/components/PlaceMedal";
import { Tv2 } from "@/components/icons";
import type { PlacementReward } from "@/lib/placement-rewards";

type StreamingPartner = { partner: { id: string; name: string; twitchLogin: string; logoUrl: string } };

/**
 * Zusatzzeile der Reihen-Kacheln: Streaming-Partner und der "Platzierungs-Bonus je Event"
 * (Reihentabellen-Konfiguration, wird mit jedem Event ausgezahlt). Die Platzierungs-Belohnungen der
 * Endwertung gehören NICHT hierher — die gibt es erst zum Abschluss der Reihe.
 */
export default function SeriesEventExtras({
  partners, bonus,
}: {
  partners: StreamingPartner[];
  /** eventPayout(ev).placements — nur Münzen, nur Plätze mit Bonus */
  bonus: PlacementReward[];
}) {
  if (partners.length === 0 && bonus.length === 0) return null;

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
      {bonus.length > 0 && (
        <span className="flex items-center gap-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300"
          title="Platzierungs-Bonus je Event: gibt es direkt nach diesem Termin">
          <span className="font-semibold">Bonus</span>
          {bonus.slice(0, 3).map(b => (
            <span key={b.place} className="flex items-center gap-0.5">
              <PlaceMedal place={b.place} />
              <Image src="/Muenze Icon.png" alt="Münzen" width={10} height={10} className="object-contain" />
              {b.coins}
            </span>
          ))}
        </span>
      )}
    </>
  );
}
