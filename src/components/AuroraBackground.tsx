"use client";

export default function AuroraBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 1 }}
    >
      {/* Basis — Schwarzviolett */}
      <div className="absolute inset-0" style={{ background: "#09090d" }} />

      {/* ── Blob 1 — Violet (oben links, zieht nach unten) ── */}
      <div
        className="aurora-blob aurora-blob--teal absolute rounded-full"
        style={{
          width: "70vw",
          height: "60vh",
          top: "-15%",
          left: "-10%",
          background:
            "radial-gradient(ellipse at center, rgba(109,40,217,0.55) 0%, rgba(91,33,182,0.28) 45%, transparent 72%)",
          filter: "blur(80px)",
        }}
      />

      {/* ── Blob 2 — Teal (unten rechts, zieht nach oben) ── */}
      <div
        className="aurora-blob aurora-blob--crimson absolute rounded-full"
        style={{
          width: "65vw",
          height: "55vh",
          bottom: "-20%",
          right: "-15%",
          background:
            "radial-gradient(ellipse at center, rgba(13,148,136,0.45) 0%, rgba(15,118,110,0.22) 45%, transparent 72%)",
          filter: "blur(80px)",
        }}
      />

      {/* ── Blob 3 — Violet-Akzent (Mitte, subtil) ── */}
      <div
        className="aurora-blob aurora-blob--accent absolute rounded-full"
        style={{
          width: "35vw",
          height: "30vh",
          top: "35%",
          left: "40%",
          background:
            "radial-gradient(ellipse at center, rgba(20,184,166,0.08) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />

      {/* Vignette — Ränder abdunkeln */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 80% at 50% 50%, transparent 30%, rgba(5,5,8,0.80) 100%)",
        }}
      />

      {/* Feine Violet-Linie oben */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent 5%, rgba(20,184,166,0.20) 35%, rgba(20,184,166,0.38) 50%, rgba(20,184,166,0.20) 65%, transparent 95%)",
        }}
      />
    </div>
  );
}
