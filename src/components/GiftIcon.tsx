import Image from "next/image";

/** Buntes Geschenk-Icon (Set-Stil), z. B. für Rückblick und Geschenke im Profil. */
export default function GiftIcon({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <Image src="/icons/currency/gift.png" alt="Geschenk" width={size} height={size}
      className={`object-contain shrink-0 ${className}`} />
  );
}
