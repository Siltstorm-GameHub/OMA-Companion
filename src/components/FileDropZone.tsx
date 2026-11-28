"use client";
import { useRef, useState, type ReactNode } from "react";
import { Upload } from "@/components/icons";

/**
 * Bereich, in den man Bilder (Screenshots) hineinziehen oder mit Strg+V einfügen kann — zusätzlich zum
 * "Hochladen"-Knopf darin. Beim Ziehen erscheint ein gestrichelter Rahmen mit Hinweis über dem Bereich.
 * Einfügen greift, sobald der Fokus im Bereich liegt (z. B. beim Schreiben im Textfeld); reiner Text wird
 * normal eingefügt, nur Dateien fängt der Bereich ab.
 */
export default function FileDropZone({
  onFiles, children, accept = "image", disabled = false, label = "Bilder hier ablegen", className = "",
}: {
  onFiles: (files: File[]) => void;
  children: ReactNode;
  /** "image" = nur Bilder, "media" = Bilder und Videos */
  accept?: "image" | "media";
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const depth = useRef(0);

  const matches = (f: File) => f.type.startsWith("image/") || (accept === "media" && f.type.startsWith("video/"));
  const hasFiles = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  function take(list: FileList | null | undefined): boolean {
    const files = Array.from(list ?? []).filter(matches);
    if (files.length === 0) return false;
    onFiles(files);
    return true;
  }

  if (disabled) return <div className={className}>{children}</div>;

  return (
    <div
      className={`relative ${className}`}
      onDragEnter={e => { if (!hasFiles(e)) return; e.preventDefault(); depth.current += 1; setDragging(true); }}
      onDragOver={e => { if (!hasFiles(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; }}
      onDragLeave={e => { if (!hasFiles(e)) return; depth.current = Math.max(0, depth.current - 1); if (depth.current === 0) setDragging(false); }}
      onDrop={e => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        depth.current = 0;
        setDragging(false);
        take(e.dataTransfer.files);
      }}
      onPaste={e => { if (take(e.clipboardData?.files)) e.preventDefault(); }}
    >
      {children}
      {dragging && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-control border-2 border-dashed border-primary bg-canvas/85">
          <span className="flex items-center gap-2 text-sm font-semibold text-primary-fg"><Upload className="size-4" /> {label}</span>
        </div>
      )}
    </div>
  );
}
