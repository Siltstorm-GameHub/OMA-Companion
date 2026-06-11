import Image from "next/image";

export default function WinIcon({
  size = 16,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <Image
      src="/Win Icon.png"
      alt="Sieg"
      width={size}
      height={size}
      className={`object-contain shrink-0 ${className}`}
    />
  );
}
