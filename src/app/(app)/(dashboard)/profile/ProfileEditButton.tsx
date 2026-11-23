"use client";
import { Pencil } from "@/components/icons";
import { PROFILE_SHOW_TAB_EVENT } from "./ProfileTabs";

/** "Bearbeiten" im Profil-Kopf: öffnet Einstellungen → Profil (Bio, Geburtstag, Twitch). */
export default function ProfileEditButton() {
  function open() {
    window.dispatchEvent(new CustomEvent(PROFILE_SHOW_TAB_EVENT, { detail: "settings" }));
    window.dispatchEvent(new Event("profile-open-editor"));
    requestAnimationFrame(() => document.getElementById("profile-editor")?.scrollIntoView({ behavior: "smooth", block: "center" }));
  }
  return (
    <button type="button" onClick={open}
      className="inline-flex items-center gap-1.5 rounded-lg border border-line-strong bg-line px-3 py-1.5 text-xs font-medium text-gray-200 hover:bg-line transition-colors max-lg:min-h-10">
      <Pencil className="w-3.5 h-3.5" /> Bearbeiten
    </button>
  );
}
