import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
  showDefaultTagline = true,
  className,
}: {
  name: string;
  logoUrl?: string;
  tagline?: string;
  size?: "sm" | "md" | "lg";
  theme?: "sidebar" | "header";
  layout?: "row" | "stacked";
  showDefaultTagline?: boolean;
  className?: string;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const isStacked = layout === "stacked";
  const logoSize = isStacked
    ? "h-16 w-16 sm:h-20 sm:w-20"
    : size === "lg"
      ? "h-11 w-11"
      : size === "sm"
        ? "h-9 w-9"
        : "h-10 w-10";
  const titleSize = size === "lg" ? "text-lg" : size === "sm" ? "text-sm" : "text-base";
  const isHeader = theme === "header";
  const showLogo = logoUrl && !logoFailed;

  useEffect(() => {
    setLogoFailed(false);
  }, [logoUrl]);

  const initialsBadge = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl font-bold",
        logoSize,
        isHeader
          ? "bg-white/20 text-white ring-2 ring-white/25"
          : "bg-primary/10 text-primary ring-1 ring-primary/20"
      )}
    >
      {initialsFromName(name)}
    </div>
  );

  const logoOrInitials = showLogo ? (
    <img
      src={logoUrl}
      alt=""
      loading="eager"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setLogoFailed(true)}
      className={cn(
        "shrink-0 rounded-xl object-contain",
        logoSize,
        isHeader ? "bg-white p-1 shadow-sm ring-2 ring-white/40" : "bg-white p-0.5 shadow-sm ring-1 ring-border"
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
        isHeader && layout === "row" && "hidden sm:block",
        isHeader ? "text-white/70" : "text-muted-foreground"
      )}
    >
      {tagline}
    </p>
  ) : !isHeader && showDefaultTagline ? (
    <p className={cn("text-xs text-muted-foreground", layout === "stacked" && "text-center")}>Church Management</p>
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
