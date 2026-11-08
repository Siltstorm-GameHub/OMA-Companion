"use client";
import type { NameTag } from "./CosmeticName";
import { useUserLook } from "./useUserLook";
import { CosmeticName, CosmeticTitle } from "./CosmeticName";

/**
 * Name (+ optional Titel) eines Users mit seiner Kosmetik — für Client-Components, die nur die
 * userId kennen. Lädt gebündelt über useUserLook (gleicher Cache wie die Avatar-Rahmen).
 */
export default function StyledUserName({
  userId, name, as, className = "", showTitle = false, titleClassName = "",
}: {
  userId?: string | null;
  name: string;
  as?: NameTag;
  className?: string;
  showTitle?: boolean;
  titleClassName?: string;
}) {
  const look = useUserLook(userId);
  const nameEl = <CosmeticName nameColor={look?.nameColor} as={as} className={className}>{name}</CosmeticName>;
  if (!showTitle) return nameEl;
  return (
    <>
      {nameEl}
      <CosmeticTitle title={look?.title} className={titleClassName} />
    </>
  );
}

/** Nur der Titel eines Users (eigene Zeile unter dem Namen in Listen). Rendert nichts ohne Titel. */
export function StyledUserTitle({ userId, className = "" }: { userId?: string | null; className?: string }) {
  const look = useUserLook(userId);
  return <CosmeticTitle title={look?.title} className={className} />;
}
