import type { ReactNode } from "react";
import { X } from "lucide-react";

export function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>;
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
    primary: "bg-[hsl(262,52%,32%)] text-white hover:bg-[hsl(262,52%,28%)]",
    secondary: "bg-secondary text-secondary-foreground",
    accent: "bg-[hsl(174,55%,42%)] text-white hover:bg-[hsl(174,55%,36%)]",
    highlight: "bg-[hsl(12,85%,62%)] text-white",
    ghost: "bg-transparent hover:bg-muted",
    danger: "bg-destructive text-white",
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={cn("inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50", styles[variant], className)}>
      {children}
    </button>
  );
}

export function Badge({ children, color = "purple", className }: { children: ReactNode; color?: "purple" | "teal" | "coral" | "gray"; className?: string }) {
  const colors = { purple: "bg-[hsl(262,52%,32%)]/10 text-[hsl(262,52%,32%)]", teal: "bg-[hsl(174,55%,42%)]/10 text-[hsl(174,50%,30%)]", coral: "bg-[hsl(12,85%,62%)]/10 text-[hsl(12,70%,45%)]", gray: "bg-muted text-muted-foreground" };
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colors[color], className)}>{children}</span>;
}

export function Input({ label, value, onChange, type = "text", placeholder, className }: { label?: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring outline-none" />
    </label>
  );
}

export function Select({ label, value, onChange, options }: { label?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm">
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function Textarea({ label, value, onChange, rows = 3 }: { label?: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm" />
    </label>
  );
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[hsl(262,52%,32%)]">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">{title}</h1>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
