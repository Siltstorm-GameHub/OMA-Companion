"use client";

// Farbstimmung und Wettereffekt laufender Saison-Events über der Spielfläche (Halloween: violetter Schleier mit Nebel, Weihnachten: kühles Licht mit Schneefall).
// Rein optisch, greift keine Eingaben ab.

export default function EventOverlay({ events }: { events: { key: string; tint: string; snow: boolean; fog: boolean }[] }) {
  if (!events.length) return null;
  return (
    <div aria-hidden className="oq-event-overlay absolute inset-0 pointer-events-none overflow-hidden rounded-md z-[4]">
      {events.map((e) => (
        <div key={e.key} className="absolute inset-0" style={{ background: e.tint }} />
      ))}
      {events.some((e) => e.fog) && <div className="oq-fog absolute inset-0" />}
      {events.some((e) => e.snow) && (<><div className="oq-snow oq-snow-a absolute inset-0" /><div className="oq-snow oq-snow-b absolute inset-0" /></>)}
    </div>
  );
}
