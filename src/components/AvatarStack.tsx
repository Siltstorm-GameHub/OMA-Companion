import Link from "next/link";
import RankedAvatar from "@/components/RankedAvatar";

type AvatarUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
  rankPoints: number;
};

export function AvatarStack({
  users,
  max = 5,
  size = "sm",
}: {
  users: AvatarUser[];
  max?: number;
  size?: "xs" | "sm";
}) {
  const visible  = users.slice(0, max);
  const overflow = users.length - max;
  const px = size === "xs" ? 20 : 24;
  const sz = size === "xs" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";

  if (users.length === 0) return null;

  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <Link
          key={u.id}
          href={`/profile/${u.id}`}
          title={u.username ?? u.name ?? ""}
          className="shrink-0 rounded-full ring-2 ring-black/60 hover:opacity-80 transition-opacity"
          style={{ marginLeft: i > 0 ? "-6px" : undefined }}
        >
          {/* Im Stack immer flach — überlappende animierte Ringe wären reines Flimmern. */}
          <RankedAvatar
            rankPoints={u.rankPoints}
            src={u.image}
            alt={u.username ?? u.name ?? "?"}
            size={px}
            variant="flat"
            className={sz}
          />
        </Link>
      ))}
      {overflow > 0 && (
        <div
          className={`${sz} rounded-full ring-2 ring-black/60 bg-white/10 text-gray-400 font-bold flex items-center justify-center text-[9px]`}
          style={{ marginLeft: "-6px" }}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
}
