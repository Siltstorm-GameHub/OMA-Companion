import { prisma } from "@/lib/prisma";
import Image from "next/image";

export default async function PartnerFooter() {
  const partners = await prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
  });

  if (partners.length === 0) return null;

  return (
    <footer className="relative z-10 px-4 sm:px-6 py-4 mt-4 mb-2">
      <div className="max-w-7xl mx-auto flex items-center gap-4 flex-wrap">
        <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-widest flex-shrink-0">
          Partner
        </span>
        <div className="flex items-center gap-3 flex-wrap">
          {partners.map((p) => (
            <a
              key={p.id}
              href={`https://twitch.tv/${p.twitchLogin}`}
              target="_blank"
              rel="noopener noreferrer"
              title={p.name}
              className="flex items-center gap-1.5 group opacity-50 hover:opacity-90 transition-opacity"
            >
              <Image
                src={p.logoUrl}
                alt={p.name}
                width={24}
                height={24}
                className="rounded-full"
              />
              <span className="text-xs text-gray-500 group-hover:text-gray-300 transition-colors hidden sm:block">
                {p.name}
              </span>
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
