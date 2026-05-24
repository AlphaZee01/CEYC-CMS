import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  LayoutDashboard,
  Bell,
  LogOut,
  X,
} from "lucide-react";
import { Badge, IconBox, cn } from "@/components/church/ui";
import { PAGE_META, type PageId, type Member } from "@/types/church";
import { PAGE_ICONS } from "@/lib/page-icons";
import { PAGE_ICON_TONES } from "@/lib/icon-colors";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { MobileBottomNav, MOBILE_NAV_PRIORITY } from "@/components/church/MobileBottomNav";

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
  settings: { name: string };
}

export function AppLayout({ activePage, onNavigate, pages, children, user, settings }: AppLayoutProps) {
  const { logout } = useAuth();
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

  const visiblePages = PAGE_META.filter((p) => pages.includes(p.id));
  const unreadCount = notifications.filter((n) => !n.read).length;
  const activePageMeta = PAGE_META.find((p) => p.id === activePage);
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

  const ActiveIcon = PAGE_ICONS[activePage] || LayoutDashboard;
  const activeTone = PAGE_ICON_TONES[activePage] || "blue";
  const isChatPage = activePage === "communications";
  const userInitials = user.name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-[100dvh] bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(18rem,85vw)] flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-transform lg:static lg:w-64 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--sidebar-border))] p-4 pt-safe sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] font-bold text-white">
              CE
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold leading-tight">{settings.name.split(" ").slice(0, 2).join(" ")}</p>
              <p className="text-xs opacity-70">Church Management</p>
            </div>
          </div>
          <button type="button" className="touch-target flex items-center justify-center rounded-lg hover:bg-[hsl(var(--sidebar-accent))] lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visiblePages.map(({ id, label }) => {
            const Icon = PAGE_ICONS[id];
            const tone = PAGE_ICON_TONES[id];
            const active = activePage === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigate(id)}
                className={cn(
                  "flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  active
                    ? "bg-[hsl(var(--sidebar-primary))] text-white shadow-sm"
                    : "hover:bg-[hsl(var(--sidebar-accent))]"
                )}
              >
                {active ? (
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={2.25} />
                  </span>
                ) : (
                  <IconBox icon={Icon} tone={tone} size="sm" variant="solid" />
                )}
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 pb-safe text-xs opacity-60 lg:pb-4">Christ Embassy LCM v1.0</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 border-b border-white/10 bg-gradient-to-r from-[hsl(var(--sidebar-accent))] via-primary to-[hsl(var(--sidebar-background))] text-white shadow-lg pt-safe",
            isChatPage && "hidden lg:block"
          )}
        >
          <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <IconBox icon={ActiveIcon} tone={activeTone} size="lg" variant="solid" className="ring-2 ring-white/25" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold leading-tight tracking-tight">
                  {activePageMeta?.label || "Dashboard"}
                </p>
                <p className="truncate text-xs text-white/70">{user.name}</p>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <div ref={notificationsRef} className="relative">
                <button
                  type="button"
                  className="touch-target relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20"
                  onClick={() => {
                    setNotificationsOpen((o) => !o);
                    if (!notificationsOpen && unreadCount > 0) markAllRead();
                  }}
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white ring-2 ring-primary">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+4rem)] z-50 max-h-[min(24rem,60dvh)] overflow-y-auto rounded-2xl border bg-card p-3 text-foreground shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-primary">Notifications</p>
                      {unreadCount > 0 && (
                        <button type="button" className="text-xs font-medium text-accent" onClick={markAllRead}>
                          Mark all read
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="py-4 text-center text-xs text-muted-foreground">No notifications</p>
                    ) : (
                      <ul className="space-y-2">
                        {notifications.slice(0, 10).map((n) => (
                          <li key={n.id} className={cn("rounded-xl border p-3 text-xs", !n.read && "bg-muted/50")}>
                            <p className="font-medium">{n.title}</p>
                            <p className="text-muted-foreground">{n.body}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">{n.createdAt}</p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>

              <div className="hidden h-8 w-px bg-white/20 sm:block" aria-hidden />

              <div className="hidden items-center gap-2 sm:flex">
                <div className="hidden text-right md:block">
                  <p className="max-w-[10rem] truncate text-sm font-medium">{user.name}</p>
                  <Badge color="blue" className="mt-0.5 bg-white/15 text-white">{user.role}</Badge>
                </div>
              </div>

              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-semibold ring-2 ring-white/30">
                {userInitials}
              </div>

              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-white/90 transition hover:bg-white/20 hover:text-white"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </header>

        <main
          className={cn(
            "flex-1 overflow-auto p-3 pb-[calc(5.75rem+env(safe-area-inset-bottom))] sm:p-4 md:p-6 lg:pb-8 lg:p-8",
            isChatPage && "p-0 pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:p-8"
          )}
        >
          {children}
        </main>

        <MobileBottomNav
          items={mobileNavItems}
          activePage={activePage}
          onNavigate={handleNavigate}
          onOpenMenu={() => setSidebarOpen(true)}
          menuActive={moreNavActive}
        />
      </div>
    </div>
  );
}
