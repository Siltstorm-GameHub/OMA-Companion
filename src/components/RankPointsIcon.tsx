import Image from "next/image";

export default function RankPointsIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/Community Icon.png"
      alt="Punkte"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
