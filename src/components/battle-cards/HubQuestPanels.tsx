"use client";

// ============================================
// Battle-Cards-Hub — OMA-Quest-Panels im Hub (Charakterblatt, Quest-Log, Fortschritt, Münzen-Laden)
// ============================================
// Dieselben Panels wie im Quest-Spiel, damit Attribute, Fähigkeiten und der Münzen-Laden nicht nur in der Welt erreichbar sind.
// Der Spiel-Look (.oq-*) gilt nur unter .oq-skin — deshalb der Wrapper. Nach einer Änderung lädt der Hub seine Serverdaten neu,
// damit Abzeichen, Münzen und "Das wartet auf dich" stimmen.

import { useRouter } from "next/navigation";
import { CharacterPanel, ProgressPanel } from "@/components/te-map/play/PlayPanels";
import QuestLog from "@/components/dnd/QuestLog";
import CoinShopPanel from "@/components/te-map/play/CoinShopPanel";

export function HubCharacterSheet() {
  const router = useRouter();
  return <div className="oq-skin"><CharacterPanel onChanged={() => router.refresh()} /></div>;
}

export function HubQuestLog() {
  return <div className="oq-skin"><QuestLog /></div>;
}

export function HubProgress() {
  return <div className="oq-skin"><ProgressPanel /></div>;
}

export function HubCoinShop() {
  const router = useRouter();
  return <div className="oq-skin"><CoinShopPanel onChanged={() => router.refresh()} /></div>;
}
