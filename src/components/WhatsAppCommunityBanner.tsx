"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { WHATSAPP_COMMUNITY_URL } from "@/lib/config";

const STORAGE_KEY = "wa_banner_dismissed";

export default function WhatsAppCommunityBanner({
  onVisibilityChange,
  fill = false,
}: {
  onVisibilityChange?: (visible: boolean) => void;
  /** Streckt die Box auf 100% der Höhe des Elternelements und zentriert den Inhalt vertikal (z.B. im Banner-Slider). */
  fill?: boolean;
} = {}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
  }, []);

  useEffect(() => {
    onVisibilityChange?.(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div style={{
      position: "relative", display: "flex", alignItems: "center", gap: 12,
      padding: "12px 16px", borderRadius: 12,
      background: "linear-gradient(135deg, rgba(37,211,102,0.12) 0%, rgba(18,140,67,0.08) 100%)",
      border: "1px solid rgba(37,211,102,0.25)",
      boxShadow: "0 4px 16px rgba(0,0,0,0.25)",
      ...(fill ? { height: "100%", boxSizing: "border-box" as const } : {}),
    }}>
      {/* WhatsApp Icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: "rgba(37,211,102,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.978-1.413A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" fill="#25D366"/>
          <path d="M17.04 14.384c-.275-.137-1.626-.8-1.879-.89-.252-.09-.436-.137-.62.138-.183.274-.71.89-.87 1.073-.16.183-.32.206-.595.069-.274-.138-1.159-.427-2.208-1.362-.816-.727-1.367-1.625-1.527-1.9-.16-.274-.017-.423.12-.56.124-.122.275-.32.412-.48.138-.16.184-.274.275-.457.092-.183.046-.343-.023-.48-.069-.137-.619-1.493-.849-2.044-.223-.537-.45-.464-.619-.472-.16-.007-.343-.009-.527-.009-.183 0-.48.069-.732.343-.252.275-.961.939-.961 2.29 0 1.352.984 2.658 1.12 2.841.138.183 1.937 2.958 4.693 4.147.656.283 1.167.452 1.566.579.658.21 1.258.18 1.73.11.528-.079 1.626-.665 1.856-1.307.229-.641.229-1.19.16-1.307-.068-.114-.252-.183-.527-.32z" fill="white"/>
        </svg>
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#4ade80", margin: 0 }}>
          WhatsApp Community
        </p>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: "2px 0 0" }}>
          Tritt unserer WhatsApp Community bei und bleib immer auf dem Laufenden!
        </p>
      </div>

      {/* CTA Button */}
      <a
        href={WHATSAPP_COMMUNITY_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, flexShrink: 0,
          background: "rgba(37,211,102,0.85)", color: "#fff",
          fontSize: 12, fontWeight: 700, textDecoration: "none",
          boxShadow: "0 2px 8px rgba(37,211,102,0.3)",
          transition: "background 150ms, transform 100ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(37,211,102,1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(37,211,102,0.85)")}
      >
        Jetzt beitreten
      </a>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        title="Nicht mehr anzeigen"
        style={{
          width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: 6, background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.3)", flexShrink: 0, transition: "color 150ms",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.3)")}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  );
}
