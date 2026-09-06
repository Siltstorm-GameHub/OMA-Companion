/**
 * Lädt eine Datei im Browser herunter. Für Bilder von einem fremden Host
 * (Vercel Blob) reicht ein simples `<a download>` oft nicht — Browser
 * ignorieren `download` bei Cross-Origin-Links und öffnen die Datei
 * stattdessen nur in einem neuen Tab. Deshalb: Bytes selbst per fetch holen
 * und als Blob-URL (immer same-origin) herunterladen.
 */
export async function downloadFile(url: string, filename: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Download fehlgeschlagen");
  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}

export function downloadText(content: string, filename: string): void {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = blobUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(blobUrl);
}
