import { useState, useEffect, useRef, createContext, useContext, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2, LogOut, X } from "lucide-react";
import { memberProfilePath } from "@/lib/rbac";
import { Badge, AvatarCircle, cn } from "@/components/church/ui";
import { PAGE_META, type PageId, type Member } from "@/types/church";
import { PAGE_ICONS } from "@/lib/page-icons";
import { ICON_TONES, PAGE_ICON_TONES } from "@/lib/icon-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MobileBottomNav, MOBILE_NAV_PRIORITY } from "@/components/church/MobileBottomNav";
import { ChurchBrand } from "@/components/church/ChurchBrand";
import { PwaInstallPrompt } from "@/components/church/PwaInstallPrompt";

const OpenMenuContext = createContext<(() => void) | null>(null);

export function useOpenMenu() {
  return useContext(OpenMenuContext);
}

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  read: boolean;
  createdAt: string;
}

export interface AppLayoutProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
  pages: PageId[];
  children: ReactNode;
  user: Member;
  settings: { name: string; logoUrl?: string; tagline?: string };
  /** Background sync (e.g. bootstrap revalidate) */
  syncing?: boolean;
}

const NAV_GROUPS: { label: string; ids: PageId[] }[] = [
  { label: "Overview", ids: ["dashboard", "reports"] },
  { label: "People", ids: ["members", "cells", "departments", "attendance"] },
  { label: "Ministry", ids: ["events", "prayer", "discipleship", "announcements", "tasks", "report-submissions"] },
  { label: "Operations", ids: ["communications", "finances", "media"] },
  { label: "Admin", ids: ["settings"] },
];

function pageLabel(id: PageId) {
  return PAGE_META.find((p) => p.id === id)?.label ?? id;
}

export function AppLayout({ activePage, onNavigate, pages, children, user, settings, syncing }: AppLayoutProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const loadNotifications = () => {
    api<Notification[]>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, [activePage]);

  useEffect(() => {
    if (!notificationsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [notificationsOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const mobileNavItems = MOBILE_NAV_PRIORITY.filter((p) => pages.includes(p)).slice(0, 4);
  const moreNavActive = sidebarOpen || !mobileNavItems.includes(activePage);

  const markAllRead = async () => {
    try {
      await api("/notifications/read-all", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      /* ignore */
    }
  };

  const handleNavigate = (page: PageId) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const isChatPage = activePage === "communications";

  const navGroups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.ids.filter((id) => pages.includes(id)),
  })).filter((g) => g.items.length > 0);

  const renderNavItem = (id: PageId) => {
    const Icon = PAGE_ICONS[id];
    const tone = PAGE_ICON_TONES[id];
    const t = ICON_TONES[tone];
    const active = activePage === id;
    return (
      <button
        key={id}
        type="button"
        onClick={() => handleNavigate(id)}
        className={cn(
          "group flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
          active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon
          className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary-foreground" : t.icon)}
          strokeWidth={active ? 2.25 : 2}
        />
        <span className="truncate">{pageLabel(id)}</span>
      </button>
    );
  };

  return (
    <OpenMenuContext.Provider value={() => setSidebarOpen(true)}>
    <div className="app-viewport flex bg-background px-safe">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(17rem,88vw)] flex-col border-r border-border bg-[hsl(var(--sidebar-background))] transition-transform duration-200 lg:static lg:h-full lg:w-64 lg:shrink-0 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-4 pt-safe lg:px-5">
          <ChurchBrand
            name={settings.name}
            logoUrl={settings.logoUrl}
            tagline={settings.tagline}
            size="sm"
            theme="sidebar"
            className="min-w-0 flex-1"
          />
          <button
            type="button"
            className="touch-target flex items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4 lg:sidebar-scroll">
          {navGroups.map((group) => (
            <div key={group.label}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                {group.label}
              </p>
              <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
            </div>
          ))}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border p-4 pb-safe lg:pb-4">
          <button
            type="button"
            onClick={() => navigate(memberProfilePath(user.id))}
            className="flex w-full items-center gap-3 rounded-xl bg-muted/50 p-3 text-left transition hover:bg-muted"
          >
            <AvatarCircle name={user.name} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.role}</p>
            </div>
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full min-h-[40px] items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-destructive"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={2} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <header
          className={cn(
            "z-30 shrink-0 border-b border-border bg-card/80 pt-safe backdrop-blur-md",
            isChatPage && "max-lg:hidden"
          )}
        >
          <div className="flex items-center gap-2 px-4 py-3 sm:gap-3 sm:px-6">
            <div className="min-w-0 flex-1">
              <ChurchBrand
                name={settings.name}
                logoUrl={settings.logoUrl}
                tagline={settings.tagline}
                size="sm"
                theme="sidebar"
                showDefaultTagline={false}
                className={cn(
                  "min-w-0",
                  settings.tagline && "[&_p:last-child]:hidden sm:[&_p:last-child]:block"
                )}
              />
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {syncing && (
                <span
                  className="flex h-10 w-10 items-center justify-center text-muted-foreground"
                  title="Syncing data"
                  aria-label="Syncing data"
                >
                  <Loader2 className="h-5 w-5 animate-spin" />
                </span>
              )}
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  className="touch-target relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground"
                  onClick={() => {
                    setNotificationsOpen((o) => !o);
                    if (!notificationsOpen && unreadCount > 0) markAllRead();
                  }}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 flex h-2 w-2 rounded-full bg-primary ring-2 ring-card" />
                  )}
                </button>
                {notificationsOpen && (
                  <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+3.5rem)] z-50 max-h-[min(24rem,60dvh)] overflow-y-auto rounded-2xl border border-border bg-card p-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold">Notifications</p>
                      {unreadCount > 0 && (
                        <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up</p>
                    ) : (
                      <ul className="space-y-2">
                        {notifications.slice(0, 10).map((n) => (
                          <li key={n.id} className={cn("rounded-xl border border-border/80 p-3 text-sm", !n.read && "bg-primary/5")}>
                            <p className="font-medium">{n.title}</p>
                            <p className="mt-0.5 text-muted-foreground">{n.body}</p>
                            <p className="mt-2 text-xs text-muted-foreground/80">{n.createdAt}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden items-center gap-2 sm:flex">
                <Badge color="blue">{user.role}</Badge>
              </div>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "min-h-0 flex-1 overscroll-contain lg:pb-8",
            isChatPage ? "overflow-hidden p-0 pb-mobile-nav" : "overflow-y-auto p-4 pb-mobile-nav sm:p-6 lg:p-8"
          )}
        >
          <div className={cn(isChatPage ? "h-full min-h-0" : "page-shell")}>{children}</div>
        </main>

        <MobileBottomNav
          items={mobileNavItems}
          activePage={activePage}
          onNavigate={handleNavigate}
          onOpenMenu={() => setSidebarOpen(true)}
          menuActive={moreNavActive}
        />
      </div>

      <PwaInstallPrompt
        churchName={settings.name}
        logoUrl={settings.logoUrl}
        tagline={settings.tagline}
      />
    </div>
    </OpenMenuContext.Provider>
  );
}
