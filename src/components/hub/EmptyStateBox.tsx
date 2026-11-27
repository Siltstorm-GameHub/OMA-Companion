import { Download } from "@/components/icons";

export function EmptyStateBox({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong p-8 text-center">
      <Download className="size-7 text-subtle" />
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}
