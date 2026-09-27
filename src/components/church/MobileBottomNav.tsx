import { LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAGE_META, type PageId } from "@/types/church";
import { PAGE_ICONS } from "@/lib/page-icons";
import { ICON_TONES, PAGE_ICON_TONES } from "@/lib/icon-colors";

export const MOBILE_NAV_PRIORITY: PageId[] = [
  "dashboard",
  "attendance",
  "communications",
  "members",
  "announcements",
  "prayer",
  "tasks",
];

const MOBILE_SHORT_LABELS: Partial<Record<PageId, string>> = {
  dashboard: "Home",
  communications: "Chat",
  announcements: "News",
  attendance: "Attendance",
  members: "Members",
  prayer: "Prayer",
  tasks: "Tasks",
};

function navLabel(id: PageId) {
  return MOBILE_SHORT_LABELS[id] || PAGE_META.find((p) => p.id === id)?.label.split(" ")[0] || id;
}

export function MobileBottomNav({
  items,
  activePage,
  onNavigate,
  onOpenMenu,
  menuActive,
}: {
  items: PageId[];
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  onOpenMenu: () => void;
  menuActive: boolean;
}) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden" aria-label="Main navigation">
      <div className="pointer-events-none px-[max(1rem,env(safe-area-inset-left))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pr-[max(1rem,env(safe-area-inset-right))] pt-2">
        <div className="pointer-events-auto mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-2xl border border-border/80 bg-card/95 p-1.5 shadow-lg backdrop-blur-xl supports-[backdrop-filter]:bg-card/90">
          {items.map((id) => {
            const Icon = PAGE_ICONS[id];
            const tone = PAGE_ICON_TONES[id];
            const active = activePage === id;
            const t = ICON_TONES[tone];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold transition-all duration-150",
                  active ? "bg-primary text-primary-foreground" : "text-muted-foreground active:scale-95"
                )}
              >
                <Icon className={cn("h-5 w-5 shrink-0", !active && t.icon)} strokeWidth={active ? 2.25 : 2} aria-hidden />
                <span className="max-w-full truncate leading-tight">{navLabel(id)}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open full menu"
            aria-expanded={menuActive}
            className={cn(
              "relative flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1 text-[10px] font-semibold transition-all duration-150",
              menuActive ? "bg-primary text-primary-foreground" : "text-muted-foreground active:scale-95"
            )}
          >
            <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={menuActive ? 2.25 : 2} aria-hidden />
            <span className="leading-tight">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
