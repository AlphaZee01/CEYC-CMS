import { useEffect, useState } from "react";
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
  layout = "row",
  className,
}: {
  name: string;
  logoUrl?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  theme?: "sidebar" | "header";
  layout?: "row" | "stacked";
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logoSize = size === "lg" ? "h-11 w-11" : size === "sm" ? "h-9 w-9" : "h-10 w-10";
  const titleSize = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  const isHeader = theme === "header";
  const showLogo = logoUrl && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const initialsBadge = (
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
  );

  const logoOrInitials = showLogo ? (
    <img
      src={logoUrl}
      alt=""
      onError={() => setLogoFailed(true)}
      className={cn(
        "shrink-0 rounded-lg object-contain",
        logoSize,
        isHeader ? "bg-white/15 ring-2 ring-white/20" : "bg-white/10"
      )}
    />
  ) : (
    initialsBadge
  );

  const title = (
    <p
      className={cn(
        "truncate font-semibold leading-tight tracking-tight",
        titleSize,
        layout === "stacked" && "whitespace-normal text-center",
        isHeader && "text-white"
      )}
    >
      {name}
    </p>
  );

  const subtitle = tagline ? (
    <p
      className={cn(
        "truncate text-xs leading-snug",
        layout === "stacked" && "whitespace-normal text-center",
        isHeader ? "text-white/70" : "opacity-70"
      )}
    >
      {tagline}
    </p>
  ) : !isHeader ? (
    <p className={cn("text-xs opacity-70", layout === "stacked" && "text-center")}>Church Management</p>
  ) : null;

  if (layout === "stacked") {
    return (
      <div className={cn("flex flex-col items-center gap-2 text-center", className)}>
        {logoOrInitials}
        <div className="min-w-0">
          {title}
          {subtitle}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      {logoOrInitials}
      <div className="min-w-0">
        {title}
        {subtitle}
      </div>
    </div>
  );
}
