import {
  LayoutDashboard,
  Users,
  Network,
  Building2,
  ClipboardCheck,
  Calendar,
  BarChart3,
  Settings,
  MessageSquare,
  Wallet,
  HeartHandshake,
  UserPlus,
  Megaphone,
  ListTodo,
  Film,
  FileText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { PageId } from "@/types/church";
import { PAGE_ICON_TONES, type IconTone } from "@/lib/icon-colors";

export const PAGE_ICONS: Record<PageId, LucideIcon> = {
  dashboard: LayoutDashboard,
  members: Users,
  cells: Network,
  departments: Building2,
  attendance: ClipboardCheck,
  events: Calendar,
  reports: BarChart3,
  communications: MessageSquare,
  finances: Wallet,
  prayer: HeartHandshake,
  discipleship: UserPlus,
  announcements: Megaphone,
  tasks: ListTodo,
  media: Film,
  "report-submissions": FileText,
  settings: Settings,
};

export function pageHeaderProps(pageId: PageId): { icon: LucideIcon; tone: IconTone } {
  return { icon: PAGE_ICONS[pageId], tone: PAGE_ICON_TONES[pageId] };
}
