import { LayoutGrid } from "lucide-react";
import { IconBox, cn } from "@/components/church/ui";
import { PAGE_META, type PageId } from "@/types/church";
import { PAGE_ICONS } from "@/lib/page-icons";
import { ICON_TONES, PAGE_ICON_TONES } from "@/lib/icon-colors";

export const MOBILE_NAV_PRIORITY: PageId[] = [
  "dashboard",
  "attendance",
  "communications",
  "members",
  "events",
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
  events: "Events",
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
    <nav
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden"
      aria-label="Main navigation"
    >
      <div className="pointer-events-none px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
        <div className="pointer-events-auto mx-auto flex max-w-lg items-stretch justify-around gap-0.5 rounded-2xl border border-border/70 bg-card/95 px-1 py-1.5 shadow-[0_-2px_24px_rgba(15,23,42,0.12),0_8px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
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
                  "relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200",
                  active
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                    : "text-muted-foreground hover:bg-muted/60 active:scale-95"
                )}
              >
                {active ? (
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
                ) : (
                  <span className={cn("flex h-9 w-9 items-center justify-center rounded-xl", t.soft)}>
                    <Icon className={cn("h-[1.15rem] w-[1.15rem]", t.icon)} strokeWidth={2} aria-hidden />
                  </span>
                )}
                <span className="max-w-full truncate leading-tight">{navLabel(id)}</span>
                {active && (
                  <span className="absolute -top-0.5 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary-foreground/80" aria-hidden />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={onOpenMenu}
            aria-label="Open full menu"
            aria-expanded={menuActive}
            className={cn(
              "relative flex min-h-[56px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition-all duration-200",
              menuActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                : "text-muted-foreground hover:bg-muted/60 active:scale-95"
            )}
          >
            {menuActive ? (
              <LayoutGrid className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            ) : (
              <IconBox icon={LayoutGrid} tone="indigo" size="sm" variant="soft" className="!h-9 !w-9" />
            )}
            <span className="leading-tight">More</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
