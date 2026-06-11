import Image from "next/image";

export default function CoinIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/Muenze Icon.png"
      alt="Münzen"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
