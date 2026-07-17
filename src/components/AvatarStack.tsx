import Link from "next/link";

type AvatarUser = {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
};

function initials(u: AvatarUser) {
  const n = u.username ?? u.name ?? "?";
  return n[0]?.toUpperCase() ?? "?";
}

const BG_COLORS = [
  "bg-amber-900/50 text-amber-300",
  "bg-blue-900/50 text-blue-300",
  "bg-purple-900/50 text-purple-300",
  "bg-emerald-900/50 text-emerald-300",
  "bg-rose-900/50 text-rose-300",
];

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
  const sz = size === "xs" ? "w-5 h-5 text-[9px]" : "w-6 h-6 text-[10px]";

  if (users.length === 0) return null;

  return (
    <div className="flex items-center">
      {visible.map((u, i) => (
        <Link
          key={u.id}
          href={`/profile/${u.id}`}
          title={u.username ?? u.name ?? ""}
          className={`${sz} rounded-full ring-2 ring-black/60 shrink-0 flex items-center justify-center font-bold overflow-hidden hover:opacity-80 transition-opacity ${
            u.image ? "" : BG_COLORS[i % BG_COLORS.length]
          }`}
          style={{ marginLeft: i > 0 ? "-6px" : undefined }}
        >
          {u.image ? (
            <img src={u.image} alt="" className="w-full h-full object-cover" />
          ) : (
            initials(u)
          )}
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
