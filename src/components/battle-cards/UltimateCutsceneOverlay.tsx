"use client";

// ============================================
// Ultimate-Cutscene — geteilt zwischen Replay (BattleScreen) und Live-Kampf
// (LiveBattleView), damit ein Ultimate in BEIDEN Ansichten denselben,
// klassen-eigenen Look bekommt statt in Live nur einen Sound zu spielen.
// ============================================
// Jede Klasse hat ihr eigenes Bild statt eines generischen, nur eingefärbten
// Icon-Boxes:
//  - TANK: dumpfes Beben (Kamera-Shake) + Boden-Schockwellenringe
//  - DAMAGE_DEALER: schnelle Strobe-Blitze + kreuzende Streak-Linien
//  - SUPPORT: ruhiger, atmender Licht-Puls + aufsteigende Partikel + rotierender Ring

import { motion } from "motion/react";
import { getClassConfig } from "./BattleCardView";
import type { UnitClass } from "@/lib/battle-engine/types";

export default function UltimateCutsceneOverlay({
  actorName,
  actorClass,
  skillName,
  description,
  fixed = false,
}: {
  actorName: string;
  actorClass: UnitClass;
  skillName: string;
  /** Nur im Replay verfügbar (RosterEntry hat den Text, der Live-Snapshot nicht). */
  description?: string;
  /** true im Live-Kampf (eigenes Vollbild-Fenster, kein positionierter Vorfahre
   *  nötig) — false im Replay (liegt über der Karte, braucht `position: relative`
   *  am Vorfahren, das BattleScreen bereits mitbringt). */
  fixed?: boolean;
}) {
  const config = getClassConfig(actorClass);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={actorClass === "TANK" ? { opacity: 1, x: [0, -3, 3, -2, 2, 0] } : { opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={
        actorClass === "TANK"
          ? { opacity: { duration: 0.25 }, x: { duration: 0.5, repeat: Infinity, repeatDelay: 0.7, ease: "easeInOut" } }
          : { duration: 0.25 }
      }
      className={`${fixed ? "fixed" : "absolute"} inset-0 rounded-xl flex flex-col items-center justify-center gap-3 z-40 overflow-hidden pointer-events-none`}
      style={{ background: "rgba(5,5,8,0.92)" }}
    >
      {/* SUPPORT: statt der harten Abdunklung ein atmender, radialer Licht-Puls
          + aufsteigende Lichtpartikel — soll ruhig/heilend wirken statt
          "Impact", passend zum Klassen-Motiv (Heilung/Segen). */}
      {actorClass === "SUPPORT" && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 55%, ${config.color}33, transparent 65%)` }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
          {Array.from({ length: 7 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: 4,
                height: 4,
                left: `${18 + i * 10}%`,
                bottom: "38%",
                background: config.color,
                boxShadow: `0 0 6px 1px ${config.color}`,
              }}
              initial={{ y: 0, opacity: 0 }}
              animate={{ y: -140, opacity: [0, 1, 0] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.28, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      {/* TANK: dumpfes, erdiges Beben statt Impact-Blitz — Boden-Schockwellen,
          die vom unteren Rand aufsteigen, passend zum "Rammbock"-Motiv
          (Wucht statt Präzision/Anmut). */}
      {actorClass === "TANK" && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(circle at 50% 88%, ${config.color}33, transparent 70%)` }}
            animate={{ opacity: [0.3, 0.9, 0.3] }}
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
          />
          {Array.from({ length: 3 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute left-1/2 bottom-10 -translate-x-1/2 rounded-full pointer-events-none"
              style={{ width: 36, height: 36, boxShadow: `0 0 0 2px ${config.color}bb` }}
              initial={{ scale: 0.3, opacity: 0.8 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
            />
          ))}
        </>
      )}

      {/* DAMAGE_DEALER: schnelle Strobe-Blitze + kreuzende Trajektorien
          (Kugel-/Pfeilspuren) statt eines ruhigen Standbilds — passend zum
          "Dauerfeuer"-Motiv (Tempo statt Wucht/Ruhe). */}
      {actorClass === "DAMAGE_DEALER" && (
        <>
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ background: config.color }}
            animate={{ opacity: [0, 0.16, 0, 0, 0.12, 0] }}
            transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
          />
          {Array.from({ length: 4 }).map((_, i) => (
            <motion.span
              key={i}
              className="absolute h-[2px] pointer-events-none"
              style={{
                width: "160%",
                top: `${18 + i * 20}%`,
                left: "-30%",
                background: `linear-gradient(90deg, transparent, ${config.color}, #fff, transparent)`,
                transform: "rotate(-18deg)",
              }}
              initial={{ opacity: 0, x: "-30%" }}
              animate={{ opacity: [0, 1, 0], x: "30%" }}
              transition={{ duration: 0.45, repeat: Infinity, delay: i * 0.22, ease: "easeIn" }}
            />
          ))}
        </>
      )}

      <motion.div
        initial={{ scale: 0.85 }}
        animate={
          actorClass === "TANK"
            ? { scale: [1.18, 0.92, 1.05, 1] }
            : actorClass === "DAMAGE_DEALER"
              ? { scale: [1, 1.1, 1, 1.1, 1] }
              : { scale: 1 }
        }
        transition={
          actorClass === "TANK"
            ? { duration: 0.6, ease: "easeOut" }
            : actorClass === "DAMAGE_DEALER"
              ? { duration: 0.5, repeat: Infinity }
              : { duration: 0.25 }
        }
        className="relative w-20 h-20 rounded-2xl flex items-center justify-center"
        style={{ background: `${config.color}22`, boxShadow: `0 0 48px ${config.color}80` }}
      >
        {actorClass === "SUPPORT" && (
          <motion.span
            className="absolute -inset-2 rounded-full pointer-events-none"
            style={{ border: `1.5px dashed ${config.color}aa` }}
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
          />
        )}
        <Icon className="w-10 h-10 relative" style={{ color: config.color }} />
      </motion.div>
      <p className="text-sm text-gray-400">{actorName}</p>
      <p className="text-xl font-black text-white text-center px-4">{skillName}</p>
      {description && <p className="text-xs text-gray-400 text-center px-8 max-w-xs">{description}</p>}
      <motion.p
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 1.1 }}
        className="text-[10px] text-gray-600 uppercase tracking-[0.2em] mt-2"
      >
        ● ● ●
      </motion.p>
    </motion.div>
  );
}
