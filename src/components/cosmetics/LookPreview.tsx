"use client";
import Image from "next/image";
import RankRing from "@/components/RankRing";
import { CosmeticName, CosmeticTitle } from "./CosmeticName";
import { getCosmetic, getCosmeticOf, type CosmeticSet, type UserLook } from "@/lib/cosmetics/catalog";

/** Avatar mit beliebigem Aussehen (Vorschau ohne Abruf). Ohne Bild: Initialen. */
export function PreviewAvatar({ look, image, name, size }: { look: UserLook; image?: string | null; name: string; size: number }) {
  const ring = Math.max(2, Math.round(size * 0.06)) + 1;
  return (
    <RankRing look={look} width={ring} rounded="rounded-full" faceClassName="w-full h-full"
      className="shrink-0" style={{ width: size, height: size, boxSizing: "border-box" }}>
      {image ? (
        <Image src={image} alt={name} width={size} height={size} className="rounded-full object-cover w-full h-full" unoptimized />
      ) : (
        <div className="rounded-full w-full h-full flex items-center justify-center font-bold bg-zinc-800 text-zinc-400"
          style={{ fontSize: Math.round(size * 0.38) }}>
          {name.slice(0, 2).toUpperCase()}
        </div>
      )}
    </RankRing>
  );
}

/** Aussehen, das ein Set ergibt (je Kategorie der erste Set-Artikel). */
export function lookOfSet(set: CosmeticSet): UserLook {
  const look: UserLook = {};
  for (const id of set.items) {
    const c = getCosmetic(id);
    if (c && !look[c.category]) look[c.category] = c.id;
  }
  return look;
}

/**
 * Kompakte Profil-Vorschau eines kompletten Aussehens: Hintergrund, Avatar mit Rahmen + Aura,
 * Name in Namensfarbe und Titel. Für Set-Karten (Shop) und die Set-Liste im Admin.
 */
export default function LookPreview({ look, image, name, size = 44, className = "" }: {
  look: UserLook;
  image?: string | null;
  name: string;
  size?: number;
  className?: string;
}) {
  const bg = getCosmeticOf(look.background, "background");
  return (
    <div className={`relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] ${className}`}>
      {bg && <div className="absolute inset-0 pointer-events-none" style={{ background: bg.css }} />}
      <div className="relative flex items-center gap-3 px-3 py-3">
        <div className="p-1.5 shrink-0">
          <PreviewAvatar look={look} image={image} name={name} size={size} />
        </div>
        <div className="min-w-0">
          <CosmeticName nameColor={look.nameColor} as="p" className="text-sm font-bold text-white truncate">{name}</CosmeticName>
          <CosmeticTitle title={look.title} className="mt-0.5" />
        </div>
      </div>
    </div>
  );
}
