import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { ICON_TONES, toneFromString, toneBadgeClass, type IconTone } from "@/lib/icon-colors";

export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

const iconBoxSizes = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-9 w-9 rounded-xl", icon: "h-4 w-4" },
  lg: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
};

export function IconBox({
  icon: Icon,
  tone = "blue",
  size = "md",
  variant = "soft",
  className,
}: {
  icon: LucideIcon;
  tone?: IconTone;
  size?: keyof typeof iconBoxSizes;
  variant?: "soft" | "solid";
  className?: string;
}) {
  const t = ICON_TONES[tone];
  const s = iconBoxSizes[size];
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        s.box,
        variant === "solid" ? t.solid : t.soft,
        className
      )}
    >
      <Icon className={cn(s.icon, variant === "solid" ? t.solidIcon : t.icon)} strokeWidth={2.25} />
    </div>
  );
}

const fieldClass =
  "w-full min-h-[44px] rounded-lg border border-input bg-background px-3 py-2.5 text-base sm:text-sm focus:ring-2 focus:ring-ring outline-none";

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5", className)}>{children}</div>;
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "highlight";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-accent text-accent-foreground hover:bg-accent/90",
    highlight: "bg-highlight text-highlight-foreground",
    ghost: "bg-transparent hover:bg-muted",
    danger: "bg-destructive text-white",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition disabled:opacity-50",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

const avatarSizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
};

export function AvatarCircle({
  name,
  size = "md",
  variant = "soft",
  className,
}: {
  name: string;
  size?: keyof typeof avatarSizes;
  variant?: "soft" | "solid";
  className?: string;
}) {
  const tone = toneFromString(name);
  const t = ICON_TONES[tone];
  const label = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full font-semibold",
        avatarSizes[size],
        variant === "solid" ? cn(t.solid, t.solidIcon) : cn(t.soft, t.icon),
        className
      )}
    >
      {label}
    </div>
  );
}

export function toneForName(name: string): IconTone {
  return toneFromString(name);
}

export function Badge({
  children,
  color = "blue",
  className,
}: {
  children: ReactNode;
  color?: IconTone | "gray" | "blue" | "sky" | "navy" | "purple" | "teal" | "coral";
  className?: string;
}) {
  const legacyMap: Record<string, IconTone> = {
    blue: "blue",
    sky: "sky",
    navy: "indigo",
    purple: "violet",
    teal: "teal",
    coral: "rose",
  };
  const colors: Record<string, string> = {
    gray: "bg-muted text-muted-foreground",
    ...Object.fromEntries(
      (Object.keys(ICON_TONES) as IconTone[]).map((tone) => [tone, toneBadgeClass(tone)])
    ),
  };
  const key = color in legacyMap ? legacyMap[color] : color;
  return (
    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colors[key] || colors.gray, className)}>
      {children}
    </span>
  );
}

export function Input({ label, value, onChange, type = "text", placeholder, className }: { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={fieldClass} />
    </label>
  );
}

export function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={fieldClass}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Textarea({ label, value, onChange, rows = 3 }: { label?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-sm font-medium">{label}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cn(fieldClass, "min-h-[88px] resize-y")} />
    </label>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="scrollbar-none -mx-1 flex gap-2 overflow-x-auto pb-1">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition",
            value === t.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-5 shadow-xl pb-safe sm:max-w-lg sm:rounded-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="touch-target flex items-center justify-center rounded-lg hover:bg-muted" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
  icon: Icon,
  tone = "blue",
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  icon?: LucideIcon;
  tone?: IconTone;
}) {
  const t = ICON_TONES[tone];
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <IconBox icon={Icon} tone={tone} size="lg" />
        ) : (
          <div className="w-1 shrink-0 self-stretch rounded-full" style={{ backgroundColor: t.chart }} />
        )}
        <div className="min-w-0 py-0.5">
          <h1
            className={cn("text-xl font-bold tracking-tight sm:text-2xl", Icon && "text-foreground")}
            style={Icon ? undefined : { color: t.chart }}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 [&_button]:w-full sm:[&_button]:w-auto">{action}</div>}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return <div className="flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end">{children}</div>;
}
