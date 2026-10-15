import Link from "next/link";
import { isPlaceholder } from "@/lib/legal";

/** Rahmen für Impressum/Datenschutz — öffentlich, ohne Login und ohne Dashboard-Chrome. */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-10 sm:py-16" style={{ background: "var(--bg-base, #080c18)" }}>
      <article className="glass rounded-2xl max-w-2xl mx-auto p-6 sm:p-10 text-sm text-gray-300 leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-8 [&_h2]:mb-2 [&_h3]:font-semibold [&_h3]:text-gray-100 [&_h3]:mt-4 [&_h3]:mb-1 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_li]:mb-1 [&_a]:text-teal-400 [&_a:hover]:underline">
        <h1 className="text-2xl font-black text-white mb-6">{title}</h1>
        {children}
        <nav className="mt-10 pt-5 border-t border-white/[0.06] flex gap-4 text-xs text-gray-500">
          <Link href="/dashboard">← Zur App</Link>
          <Link href="/impressum">Impressum</Link>
          <Link href="/datenschutz">Datenschutz</Link>
        </nav>
      </article>
    </main>
  );
}

/** Zeigt einen Wert aus LEGAL; noch nicht ausgefüllte Platzhalter werden auffällig markiert. */
export function LegalValue({ value }: { value: string }) {
  if (!isPlaceholder(value)) return <>{value}</>;
  return <mark className="bg-amber-400/20 text-amber-300 px-1 rounded">{value}</mark>;
}
