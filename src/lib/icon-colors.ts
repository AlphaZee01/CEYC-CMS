import type { LucideIcon } from "lucide-react";
import type { PageId } from "@/types/church";

export type IconTone =
  | "blue"
  | "sky"
  | "indigo"
  | "violet"
  | "cyan"
  | "teal"
  | "emerald"
  | "amber"
  | "rose"
  | "orange";

export const ICON_TONE_LIST: IconTone[] = [
  "blue",
  "sky",
  "indigo",
  "violet",
  "cyan",
  "teal",
  "emerald",
  "amber",
  "rose",
  "orange",
];

export const ICON_TONES: Record<
  IconTone,
  { soft: string; icon: string; solid: string; solidIcon: string; ring: string; chart: string }
> = {
  blue: {
    soft: "bg-blue-500/12",
    icon: "text-blue-600",
    solid: "bg-blue-600",
    solidIcon: "text-white",
    ring: "ring-blue-500/25",
    chart: "#2563EB",
  },
  sky: {
    soft: "bg-sky-500/12",
    icon: "text-sky-600",
    solid: "bg-sky-500",
    solidIcon: "text-white",
    ring: "ring-sky-500/25",
    chart: "#0EA5E9",
  },
  indigo: {
    soft: "bg-indigo-500/12",
    icon: "text-indigo-600",
    solid: "bg-indigo-600",
    solidIcon: "text-white",
    ring: "ring-indigo-500/25",
    chart: "#4F46E5",
  },
  violet: {
    soft: "bg-violet-500/12",
    icon: "text-violet-600",
    solid: "bg-violet-600",
    solidIcon: "text-white",
    ring: "ring-violet-500/25",
    chart: "#7C3AED",
  },
  cyan: {
    soft: "bg-cyan-500/12",
    icon: "text-cyan-600",
    solid: "bg-cyan-600",
    solidIcon: "text-white",
    ring: "ring-cyan-500/25",
    chart: "#0891B2",
  },
  teal: {
    soft: "bg-teal-500/12",
    icon: "text-teal-600",
    solid: "bg-teal-600",
    solidIcon: "text-white",
    ring: "ring-teal-500/25",
    chart: "#0D9488",
  },
  emerald: {
    soft: "bg-emerald-500/12",
    icon: "text-emerald-600",
    solid: "bg-emerald-600",
    solidIcon: "text-white",
    ring: "ring-emerald-500/25",
    chart: "#059669",
  },
  amber: {
    soft: "bg-amber-500/12",
    icon: "text-amber-600",
    solid: "bg-amber-500",
    solidIcon: "text-white",
    ring: "ring-amber-500/25",
    chart: "#D97706",
  },
  rose: {
    soft: "bg-rose-500/12",
    icon: "text-rose-600",
    solid: "bg-rose-500",
    solidIcon: "text-white",
    ring: "ring-rose-500/25",
    chart: "#E11D48",
  },
  orange: {
    soft: "bg-orange-500/12",
    icon: "text-orange-600",
    solid: "bg-orange-500",
    solidIcon: "text-white",
    ring: "ring-orange-500/25",
    chart: "#EA580C",
  },
};

export const CHART_COLORS = ICON_TONE_LIST.map((tone) => ICON_TONES[tone].chart);

/** Saturated, well-separated hues for pie charts and category legends (max contrast between neighbors). */
export const PIE_SEGMENT_COLORS = [
  "#4F46E5",
  "#EA580C",
  "#059669",
  "#DB2777",
  "#CA8A04",
  "#7C3AED",
  "#0284C7",
  "#DC2626",
  "#0D9488",
  "#9333EA",
  "#2563EB",
  "#C2410C",
] as const;

export function pieSegmentColor(index: number): string {
  return PIE_SEGMENT_COLORS[index % PIE_SEGMENT_COLORS.length];
}

export const PAGE_ICON_TONES: Record<PageId, IconTone> = {
  dashboard: "blue",
  members: "indigo",
  cells: "cyan",
  departments: "violet",
  attendance: "emerald",
  events: "amber",
  reports: "sky",
  communications: "teal",
  finances: "emerald",
  prayer: "rose",
  discipleship: "violet",
  announcements: "orange",
  tasks: "amber",
  media: "rose",
  "report-submissions": "cyan",
  settings: "indigo",
};

export function toneFromString(value: string): IconTone {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return ICON_TONE_LIST[Math.abs(hash) % ICON_TONE_LIST.length];
}

export function toneBadgeClass(tone: IconTone) {
  const t = ICON_TONES[tone];
  return `${t.soft} ${t.icon}`;
}
