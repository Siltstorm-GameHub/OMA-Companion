"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { ChevronDown, LogOut, MessageCircleMore, ShieldCheck } from "@/components/icons";
import RankedAvatar from "@/components/RankedAvatar";
import PwaInstallButton from "@/components/PwaInstallButton";
import { WHATSAPP_COMMUNITY_URL } from "@/lib/config";
import { ME_NAV } from "./nav-config";

/** Avatar-Menü rechts in der Kopfzeile: persönliche Bereiche, Admin, WhatsApp, App, Abmelden. */
export function UserMenu() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const user = session?.user as { id?: string; name?: string | null; image?: string | null; role?: string } | undefined;
  const isStaff = user?.role === "admin" || user?.role === "moderator";
  const name = user?.name ?? "?";

  // Schließen bei Klick außerhalb, Escape oder Seitenwechsel
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Menü bei Navigation schließen
  useEffect(() => { setOpen(false); }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Benutzermenü"
        className="flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface p-1 hover:border-line-strong lg:pr-3"
      >
        <RankedAvatar userId={user?.id} src={user?.image} alt={name} size={32} />
        <span className="hidden max-w-32 truncate text-sm font-semibold text-fg lg:inline">{name}</span>
        {/* Wrapper, weil die Pictoicons selbst inline-block setzen und "hidden" sonst überstimmen */}
        <span className="hidden lg:inline-flex">
          <ChevronDown className={`size-4 text-subtle transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
        </span>
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-64 rounded-card border border-line bg-surface-2 p-2 shadow-pop">
          {ME_NAV.map((item) => (
            <MenuLink key={item.href} href={item.href} icon={<item.icon className="size-4" aria-hidden />}>
              {item.label}
            </MenuLink>
          ))}
          {isStaff && (
            <MenuLink href="/admin" icon={<ShieldCheck className="size-4" aria-hidden />}>Admin-Bereich</MenuLink>
          )}
          <div className="my-1.5 h-px bg-line" />
          <a
            href={WHATSAPP_COMMUNITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            className="flex min-h-10 items-center gap-2.5 rounded-control px-3 text-sm text-muted hover:bg-surface-3 hover:text-fg"
          >
            <MessageCircleMore className="size-4" aria-hidden /> WhatsApp-Community
          </a>
          <PwaInstallButton />
          <button
            type="button"
            role="menuitem"
            onClick={() => signOut()}
            className="flex min-h-10 w-full items-center gap-2.5 rounded-control px-3 text-left text-sm text-muted hover:bg-surface-3 hover:text-fg"
          >
            <LogOut className="size-4" aria-hidden /> Abmelden
          </button>
        </div>
      )}
    </div>
  );
}

function MenuLink(props: { href: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Link
      href={props.href}
      role="menuitem"
      className="flex min-h-10 items-center gap-2.5 rounded-control px-3 text-sm text-muted hover:bg-surface-3 hover:text-fg"
    >
      {props.icon}
      {props.children}
    </Link>
  );
}
