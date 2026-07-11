"use client";

export default function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Basis — folgt Theme (dunkel/hell) */}
      <div className="absolute inset-0" style={{ background: "var(--bg-base)" }} />

      {/* ── Blob 1 — Logo-Teal (oben links) ── */}
      <div
        className="aurora-blob aurora-blob--teal absolute rounded-full"
        style={{
          width: "70vw",
          height: "60vh",
          top: "-15%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.30) 0%, rgba(13,148,136,0.14) 45%, transparent 72%)",
          filter: "blur(80px)",
        }}
      />

      {/* ── Blob 2 — Logo-Rot (unten rechts) ── */}
      <div
        className="aurora-blob aurora-blob--crimson absolute rounded-full"
        style={{
          width: "65vw",
          height: "55vh",
          bottom: "-20%",
          right: "-15%",
          background:
            "radial-gradient(ellipse at center, rgba(139,32,32,0.28) 0%, rgba(100,20,20,0.13) 45%, transparent 72%)",
          filter: "blur(80px)",
        }}
      />

      {/* ── Blob 3 — Teal-Akzent (Mitte, subtil) ── */}
      <div
        className="aurora-blob aurora-blob--accent absolute rounded-full"
        style={{
          width: "35vw",
          height: "30vh",
          top: "35%",
          left: "40%",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.07) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Vignette — Ränder abdunkeln/abhellen, folgt Theme */}
      <div
        className="absolute inset-0"
        style={{ background: "var(--aurora-vignette)" }}
      />

      {/* Feine Teal-Linie oben */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(139,32,32,0.25) 25%, rgba(20,184,166,0.40) 50%, rgba(139,32,32,0.25) 75%, transparent 95%)",
        }}
      />
    </div>
  );
}
