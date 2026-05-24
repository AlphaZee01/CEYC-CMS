import { cn } from "@/components/church/ui";

function initialsFromName(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ChurchBrand({
  name,
  logoUrl,
  tagline,
  size = "md",
  theme = "sidebar",
  className,
}: {
  name: string;
  logoUrl?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  theme?: "sidebar" | "header";
  className?: string;
}) {
  const logoSize = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const titleSize = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  const isHeader = theme === "header";

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {logoUrl ? (
        <img
          src={logoUrl}
          alt=""
          className={cn(
            "shrink-0 rounded-lg object-contain",
            logoSize,
            isHeader ? "bg-white/15 ring-2 ring-white/20" : "bg-white/10"
          )}
        />
      ) : (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center rounded-lg font-bold",
            logoSize,
            isHeader
              ? "bg-white/20 text-white ring-2 ring-white/25"
              : "bg-[hsl(var(--sidebar-primary))] text-white"
          )}
        >
          {initialsFromName(name)}
        </div>
      )}
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-semibold leading-tight tracking-tight",
            titleSize,
            isHeader && "text-white"
          )}
        >
          {name}
        </p>
        {tagline ? (
          <p
            className={cn(
              "truncate text-xs leading-snug",
              isHeader ? "text-white/70" : "opacity-70"
            )}
          >
            {tagline}
          </p>
        ) : !isHeader ? (
          <p className="text-xs opacity-70">Church Management</p>
        ) : null}
      </div>
    </div>
  );
}
