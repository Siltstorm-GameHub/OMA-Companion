"use client";
import { useRouter } from "next/navigation";
import { CSSProperties, MouseEvent, ReactNode } from "react";
import { useGuestGate } from "@/components/GuestGate";
import { isGuestAllowedPath } from "@/lib/guest-access";

export default function EventCardLink({
  href,
  className,
  style,
  children,
}: {
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const router = useRouter();
  const { isGuest, openGate } = useGuestGate();

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    if (isGuest && !isGuestAllowedPath(href)) {
      openGate({ href });
      return;
    }
    router.push(href);
  }

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
