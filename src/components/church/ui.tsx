import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ICON_TONES, toneFromString, toneBadgeClass, type IconTone } from "@/lib/icon-colors";

export { cn };

const iconBoxSizes = {
  sm: { box: "h-8 w-8 rounded-xl", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-[18px] w-[18px]" },
  lg: { box: "h-12 w-12 rounded-2xl", icon: "h-5 w-5" },
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
      <Icon className={cn(s.icon, variant === "solid" ? t.solidIcon : t.icon)} strokeWidth={2} />
    </div>
  );
}

const fieldClass =
  "w-full min-h-[44px] rounded-xl border border-input bg-background px-3.5 py-2.5 text-base shadow-sm transition placeholder:text-muted-foreground/70 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm";

export function Card({
  children,
  className,
  ...props
}: ComponentPropsWithoutRef<"div"> & { children: ReactNode }) {
  return (
    <div className={cn("surface-card p-4 sm:p-5", className)} {...props}>
      {children}
    </div>
  );
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
    primary: "bg-primary text-primary-foreground shadow-sm shadow-primary/20 hover:bg-primary/90 active:scale-[0.98]",
    secondary: "border border-border bg-background text-foreground shadow-sm hover:bg-muted/80 active:scale-[0.98]",
    accent: "bg-accent text-accent-foreground shadow-sm hover:bg-accent/90 active:scale-[0.98]",
    highlight: "bg-highlight text-highlight-foreground shadow-sm hover:bg-highlight/90 active:scale-[0.98]",
    ghost: "text-muted-foreground hover:bg-muted hover:text-foreground",
    danger: "bg-destructive text-white shadow-sm hover:bg-destructive/90 active:scale-[0.98]",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50",
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
  md: "h-10 w-10 text-sm",
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
        "flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-background",
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
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", colors[key] || colors.gray, className)}>
      {children}
    </span>
  );
}

export function Input({ label, value, onChange, type = "text", placeholder, className, disabled }: { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string; disabled?: boolean }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} className={cn(fieldClass, disabled && "cursor-not-allowed opacity-60")} />
    </label>
  );
}

export function Select({ label, value, onChange, options, disabled }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return (
    <label className="block">
      {label && <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={cn(fieldClass, disabled && "cursor-not-allowed opacity-60")}>
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
      {label && <span className="mb-2 block text-sm font-medium text-foreground">{label}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className={cn(fieldClass, "min-h-[88px] resize-y")} />
    </label>
  );
}

export function TabBar<T extends string>({ tabs, value, onChange }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex w-full max-w-full gap-1 rounded-xl border border-border bg-muted/50 p-1 sm:w-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "min-h-[40px] flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all sm:flex-none",
            value === t.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

const modalSizes = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "lg",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: keyof typeof modalSizes;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div
        className={cn(
          "max-h-[85dvh] w-full overflow-y-auto rounded-t-2xl bg-card p-4 pb-safe shadow-2xl sm:rounded-2xl sm:p-5",
          modalSizes[size]
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
          <button type="button" onClick={onClose} className="touch-target flex items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Close">
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
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {Icon && <IconBox icon={Icon} tone={tone} size="lg" />}
        <div className="min-w-0">
          <h1 className="text-balance text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground sm:text-base">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2 [&_button]:w-full sm:[&_button]:w-auto">{action}</div>}
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-row gap-2 border-t border-border pt-4 [&>*]:min-h-[44px] [&>*]:min-w-0 [&>*]:flex-1 sm:[&>*]:flex-none">
      {children}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          <Icon className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
        </div>
      )}
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
