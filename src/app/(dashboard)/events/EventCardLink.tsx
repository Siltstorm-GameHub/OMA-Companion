"use client";
import { useRouter } from "next/navigation";
import { CSSProperties, MouseEvent, ReactNode } from "react";

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

  function handleClick(e: MouseEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("a, button")) return;
    router.push(href);
  }

  return (
    <div onClick={handleClick} className={`cursor-pointer ${className ?? ""}`} style={style}>
      {children}
    </div>
  );
}
