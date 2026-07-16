let ctx: AudioContext | null = null;

// Kurzer, dezenter Zwei-Ton-Chime für "neuer Inhalt seit letztem Besuch"
export function playNotifySound() {
  try {
    if (!ctx) ctx = new AudioContext();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.36);
  } catch {
    // AudioContext nicht verfügbar (z.B. Autoplay-Policy) — Sound einfach überspringen
  }
}
