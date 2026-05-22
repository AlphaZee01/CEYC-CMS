import { useState, useEffect, type ReactNode } from "react";
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
  Menu,
  Bell,
  LogOut,
  X,
} from "lucide-react";
import { Badge, cn } from "@/components/church/ui";
import { PAGE_META, type PageId, type Member } from "@/types/church";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const PAGE_ICONS: Record<PageId, typeof LayoutDashboard> = {
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

  const loadNotifications = () => {
    api<Notification[]>("/notifications")
      .then(setNotifications)
      .catch(() => setNotifications([]));
  };

  useEffect(() => {
    loadNotifications();
  }, [activePage]);

  const visiblePages = PAGE_META.filter((p) => pages.includes(p.id));
  const unreadCount = notifications.filter((n) => !n.read).length;

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

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-hidden />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-transform lg:static lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[hsl(var(--sidebar-border))] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] font-bold text-white">
              CE
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">{settings.name.split(" ").slice(0, 2).join(" ")}</p>
              <p className="text-xs opacity-70">Church Management</p>
            </div>
          </div>
          <button type="button" className="rounded-lg p-1 hover:bg-[hsl(var(--sidebar-accent))] lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
          {visiblePages.map(({ id, label }) => {
            const Icon = PAGE_ICONS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => handleNavigate(id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition",
                  activePage === id
                    ? "bg-[hsl(var(--sidebar-primary))] text-white"
                    : "hover:bg-[hsl(var(--sidebar-accent))]"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 text-xs opacity-60">Christ Embassy LCM v1.0</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-card px-4 py-3 shadow-sm">
          <button
            type="button"
            className="rounded-lg p-2 hover:bg-muted lg:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />

          <div className="relative">
            <button
              type="button"
              className="relative rounded-lg p-2 hover:bg-muted"
              onClick={() => {
                setNotificationsOpen((o) => !o);
                if (!notificationsOpen && unreadCount > 0) markAllRead();
              }}
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(12,85%,62%)] text-[10px] text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl border bg-card p-3 shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && (
                    <button type="button" className="text-xs text-[hsl(174,55%,42%)]" onClick={markAllRead}>
                      Mark all read
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="py-4 text-center text-xs text-muted-foreground">No notifications</p>
                ) : (
                  <ul className="max-h-64 space-y-2 overflow-y-auto">
                    {notifications.slice(0, 10).map((n) => (
                      <li key={n.id} className={cn("rounded-lg border p-2 text-xs", !n.read && "bg-muted/50")}>
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

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.name}</p>
              <Badge color="purple">{user.role}</Badge>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(262,52%,32%)] text-sm font-medium text-white">
              {user.name.charAt(0)}
            </div>
            <button
              type="button"
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
