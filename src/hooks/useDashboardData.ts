import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Member, Role } from "@/types/church";

export type DashboardActivity = { id: string; text: string; time: string };
export type DashboardEvent = { id: string; title: string; date: string; time: string; rsvpIds: string[] };
export type DashboardAnnouncementItem = {
  id: string;
  title: string;
  content: string;
  target: "all" | "fellowship" | "cell" | "department" | "role" | "leaders";
  targetId?: string;
  targetRole?: string;
  pinned: boolean;
  expiresAt: string;
  createdAt?: string;
};

export type DashboardStats = {
  members: number;
  cells: number;
  fellowships: number;
  departments: number;
  lastCellMeeting: string | null;
};

export type DashboardOverview = {
  pastoral: boolean;
  showFinances: boolean;
  counts: {
    members: number;
    cells: number;
    fellowships: number;
    departments: number;
    newMembersThisMonth: number;
    pendingPrayers: number;
    pendingTasks: number;
    overdueTasks: number;
    pendingReports: number;
    activeFollowUps: number;
  };
  lastService: { date: string; present: number; absent: number; total: number; rate: number } | null;
  previousService: { date: string; present: number; rate: number } | null;
  lastServiceNewcomers: {
    members: { id: string; name: string; role: string; phone: string | null; joinedAt: string }[];
    guests: { id?: string; name: string; contact: string | null }[];
    total: number;
  };
  attendanceDelta: number | null;
  lastOffering: { date: string; tithe: number; offering: number; seed: number; total: number } | null;
  monthFinances: { income: number; expense: number; net: number; offeringTotal: number; titheTotal: number } | null;
  cellHealth: { avgAttendance: number; meetingsThisMonth: number; topCell: { name: string; present: number; date: string } | null };
  serviceTrend: { date: string; present: number }[];
  fellowshipCellAttendance: { name: string; present: number }[];
  prayersSummary: { pending: number; prayed: number; answered: number };
  tasksDue: { id: string; title: string; dueDate: string; priority: string; status: string }[];
  pendingReports: { id: string; type: string; period: string; submitterName: string; attendanceCount: number; newVisitors: number; status: string }[];
  followUpsByStage: { stage: string; count: number }[];
  nextEvent: { id: string; title: string; date: string; time: string; location: string; rsvpCount: number } | null;
  announcements: DashboardAnnouncementItem[];
  birthdaysThisMonth: unknown;
};

type DashboardSnapshot = {
  stats: DashboardStats;
  overview: DashboardOverview | null;
  activities: DashboardActivity[];
  events: DashboardEvent[];
  dashboardAnnouncements: DashboardAnnouncementItem[];
};

const EMPTY_STATS: DashboardStats = {
  members: 0,
  cells: 0,
  fellowships: 0,
  departments: 0,
  lastCellMeeting: null,
};

const cache = new Map<string, DashboardSnapshot>();

export function clearDashboardDataCache() {
  cache.clear();
}

function cacheKey(userId: string, role: Role) {
  return `${userId}:${role}`;
}

function activeMemberCount(members: Member[]) {
  return members.filter((m) => m.active).length;
}

function newMembersThisMonthFromList(members: Member[]) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return members.filter((m) => m.active && m.joinedAt?.startsWith(prefix)).length;
}

function buildFallbackOverview(
  role: Role,
  counts: { members: number; cells: number; fellowships: number; departments: number; newMembersThisMonth: number }
): DashboardOverview {
  const pastoral = role === "Senior Pastor" || role === "Associate Pastor" || role === "Admin";
  const showFinances = role === "Senior Pastor" || role === "Admin";
  return {
    pastoral,
    showFinances,
    counts: {
      members: counts.members,
      cells: counts.cells,
      fellowships: counts.fellowships,
      departments: counts.departments,
      newMembersThisMonth: counts.newMembersThisMonth,
      pendingPrayers: 0,
      pendingTasks: 0,
      overdueTasks: 0,
      pendingReports: 0,
      activeFollowUps: 0,
    },
    lastService: null,
    previousService: null,
    lastServiceNewcomers: { members: [], guests: [], total: 0 },
    attendanceDelta: null,
    lastOffering: null,
    monthFinances: null,
    cellHealth: { avgAttendance: 0, meetingsThisMonth: 0, topCell: null },
    serviceTrend: [],
    fellowshipCellAttendance: [],
    prayersSummary: { pending: 0, prayed: 0, answered: 0 },
    tasksDue: [],
    pendingReports: [],
    followUpsByStage: [],
    nextEvent: null,
    announcements: [],
    birthdaysThisMonth: null,
  };
}

type UseDashboardDataArgs = {
  userId: string;
  role: Role;
  pastoral: boolean;
  hasAnnouncementsPage: boolean;
  members: Member[];
  cells: unknown[];
  fellowships: unknown[];
  departments: unknown[];
};

export function useDashboardData({
  userId,
  role,
  pastoral,
  hasAnnouncementsPage,
  members,
  cells,
  fellowships,
  departments,
}: UseDashboardDataArgs) {
  const key = cacheKey(userId, role);
  const snapshot = cache.get(key);

  const [stats, setStats] = useState<DashboardStats>(snapshot?.stats ?? EMPTY_STATS);
  const [overview, setOverview] = useState<DashboardOverview | null>(snapshot?.overview ?? null);
  const [activities, setActivities] = useState<DashboardActivity[]>(snapshot?.activities ?? []);
  const [events, setEvents] = useState<DashboardEvent[]>(snapshot?.events ?? []);
  const [dashboardAnnouncements, setDashboardAnnouncements] = useState<DashboardAnnouncementItem[]>(
    snapshot?.dashboardAnnouncements ?? []
  );
  const [initialLoading, setInitialLoading] = useState(!snapshot);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const bootstrapCounts = {
      members: activeMemberCount(members),
      cells: cells.length,
      fellowships: fellowships.length,
      departments: departments.length,
      newMembersThisMonth: newMembersThisMonthFromList(members),
    };

    const applyBootstrapStats = (): DashboardStats => ({
      members: bootstrapCounts.members,
      cells: bootstrapCounts.cells,
      fellowships: bootstrapCounts.fellowships,
      departments: bootstrapCounts.departments,
      lastCellMeeting: null,
    });

    if (cache.has(key)) setRefreshing(true);
    else setInitialLoading(true);

    const showEvents = role !== "Cell Member" && role !== "Church Member";
    const showAnnouncements = hasAnnouncementsPage && !pastoral;

    (async () => {
      const primaryP = pastoral
        ? api<DashboardOverview>("/dashboard/overview")
        : api<DashboardStats>("/dashboard/stats");

      const [actsResult, primaryResult, eventsResult, announcementsResult] = await Promise.all([
        api<DashboardActivity[]>("/activities").catch(() => null),
        primaryP.catch(() => null),
        showEvents ? api<DashboardEvent[]>("/events").catch(() => null) : Promise.resolve(null),
        showAnnouncements
          ? api<DashboardAnnouncementItem[]>("/announcements").catch(() => null)
          : Promise.resolve(null),
      ]);

      if (cancelled) return;

      const prior = cache.get(key);
      let nextStats = prior?.stats ?? applyBootstrapStats();
      let nextOverview = prior?.overview ?? null;
      let nextActivities = prior?.activities ?? [];
      let nextEvents = prior?.events ?? [];
      let nextAnnouncements = prior?.dashboardAnnouncements ?? [];

      if (actsResult) {
        nextActivities = actsResult;
        setActivities(actsResult);
      }

      if (pastoral) {
        if (primaryResult) {
          nextOverview = primaryResult;
          setOverview(primaryResult);
        } else {
          toast.error("Could not load dashboard overview");
          const fallback = buildFallbackOverview(role, bootstrapCounts);
          nextOverview = fallback;
          setOverview(fallback);
          nextStats = applyBootstrapStats();
          setStats(nextStats);
          const s = await api<DashboardStats>("/dashboard/stats").catch(() => null);
          if (!cancelled && s) {
            nextStats = s;
            setStats(s);
            nextOverview = buildFallbackOverview(role, {
              ...bootstrapCounts,
              members: s.members,
              cells: s.cells,
              fellowships: s.fellowships,
              departments: s.departments,
            });
            setOverview(nextOverview);
          }
        }
      } else if (primaryResult) {
        nextStats = primaryResult;
        setStats(primaryResult);
      } else {
        toast.error("Could not load dashboard stats");
        nextStats = applyBootstrapStats();
        setStats(nextStats);
      }

      if (eventsResult) {
        nextEvents = eventsResult;
        setEvents(eventsResult);
      }
      if (announcementsResult) {
        nextAnnouncements = announcementsResult.slice(0, 5);
        setDashboardAnnouncements(nextAnnouncements);
      }

      cache.set(key, {
        stats: nextStats,
        overview: nextOverview,
        activities: nextActivities,
        events: nextEvents,
        dashboardAnnouncements: nextAnnouncements,
      });
    })().finally(() => {
      if (!cancelled) {
        setInitialLoading(false);
        setRefreshing(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh when bootstrap lists change
  }, [key, pastoral, hasAnnouncementsPage, role, members, cells, fellowships, departments]);

  return {
    stats,
    overview,
    activities,
    events,
    dashboardAnnouncements,
    initialLoading,
    refreshing,
  };
}
