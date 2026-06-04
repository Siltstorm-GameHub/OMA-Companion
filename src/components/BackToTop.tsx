"use client";
import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // The scrollable container is <main> in the dashboard layout
    const el = document.querySelector("main");
    if (!el) return;

    function onScroll() {
      setVisible((el?.scrollTop ?? 0) > 300);
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  function scrollToTop() {
    document.querySelector("main")?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <button
      onClick={scrollToTop}
      aria-label="Nach oben scrollen"
      className={`fixed bottom-24 right-4 md:bottom-6 md:right-6 z-50 w-10 h-10 rounded-xl glass-heavy flex items-center justify-center text-gray-400 hover:text-white border border-white/[0.08] hover:border-rose-500/30 shadow-lg transition-all duration-300 active:scale-95 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <ChevronUp className="w-4 h-4" />
    </button>
  );
}
