"use client";

export default function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Basis — sehr dunkles Schwarz-Grün */}
      <div className="absolute inset-0" style={{ background: "#050c0a" }} />

      {/* ── Blob 1 — Teal (oben links, zieht nach rechts) ── */}
      <div
        className="aurora-blob aurora-blob--teal absolute rounded-full"
        style={{
          width: "70vw",
          height: "60vh",
          top: "-15%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.75) 0%, rgba(13,148,136,0.40) 45%, transparent 72%)",
          filter: "blur(72px)",
        }}
      />

      {/* ── Blob 2 — Burgund/Rot (unten rechts, zieht nach links) ── */}
      <div
        className="aurora-blob aurora-blob--crimson absolute rounded-full"
        style={{
          width: "65vw",
          height: "55vh",
          bottom: "-20%",
          right: "-15%",
          background:
            "radial-gradient(ellipse at center, rgba(139,31,42,0.80) 0%, rgba(100,20,30,0.42) 45%, transparent 72%)",
          filter: "blur(80px)",
        }}
      />

      {/* ── Blob 3 — kleiner Teal-Akzent (Mitte, subtil) ── */}
      <div
        className="aurora-blob aurora-blob--accent absolute rounded-full"
        style={{
          width: "35vw",
          height: "30vh",
          top: "35%",
          left: "40%",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Vignette — Ränder abdunkeln, Mitte bleibt offen */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(3,7,6,0.75) 100%)",
        }}
      />

      {/* Feine Teal-Linie oben */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(20,184,166,0.25) 35%, rgba(20,184,166,0.40) 50%, rgba(20,184,166,0.25) 65%, transparent 95%)",
        }}
      />
    </div>
  );
}
