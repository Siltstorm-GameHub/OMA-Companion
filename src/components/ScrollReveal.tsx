/**
 * Früher: blendete Kinder beim Scrollen verzögert ein. Das ruhige Dashboard-Design (Richtung G)
 * zeigt Inhalte sofort — die Komponente bleibt als schlichter Wrapper bestehen, damit die
 * bestehenden Aufrufe unverändert funktionieren.
 */
export function ScrollReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return <div className={className}>{children}</div>;
}
