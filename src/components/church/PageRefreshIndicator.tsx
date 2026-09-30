import { Loader2 } from "lucide-react";

export function PageRefreshIndicator({ label = "Updating…" }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-2 text-sm text-muted-foreground"
      aria-live="polite"
      title="Refreshing data"
    >
      <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
      {label}
    </span>
  );
}
