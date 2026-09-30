import { toast } from "sonner";
import { api } from "@/lib/api";
import type { Member, Role } from "@/types/church";
import { clearPageDataCache, useStaleWhileRevalidate } from "@/hooks/useStaleWhileRevalidate";

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

async function fetchDashboardSnapshot(args: {
  role: Role;
  pastoral: boolean;
  hasAnnouncementsPage: boolean;
  members: Member[];
  cells: unknown[];
  fellowships: unknown[];
  departments: unknown[];
}): Promise<DashboardSnapshot> {
  const bootstrapCounts = {
    members: activeMemberCount(args.members),
    cells: args.cells.length,
    fellowships: args.fellowships.length,
    departments: args.departments.length,
    newMembersThisMonth: newMembersThisMonthFromList(args.members),
  };

  const applyBootstrapStats = (): DashboardStats => ({
    members: bootstrapCounts.members,
    cells: bootstrapCounts.cells,
    fellowships: bootstrapCounts.fellowships,
    departments: bootstrapCounts.departments,
    lastCellMeeting: null,
  });

  const showEvents = args.role !== "Cell Member" && args.role !== "Church Member";
  const showAnnouncements = args.hasAnnouncementsPage && !args.pastoral;

  const primaryP = args.pastoral
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

  let stats = applyBootstrapStats();
  let overview: DashboardOverview | null = null;
  const activities = actsResult ?? [];
  const events = eventsResult ?? [];
  let dashboardAnnouncements: DashboardAnnouncementItem[] = [];

  if (args.pastoral) {
    if (primaryResult) {
      overview = primaryResult as DashboardOverview;
    } else {
      toast.error("Could not load dashboard overview");
      overview = buildFallbackOverview(args.role, bootstrapCounts);
      stats = applyBootstrapStats();
      const s = await api<DashboardStats>("/dashboard/stats").catch(() => null);
      if (s) {
        stats = s;
        overview = buildFallbackOverview(args.role, {
          ...bootstrapCounts,
          members: s.members,
          cells: s.cells,
          fellowships: s.fellowships,
          departments: s.departments,
        });
      }
    }
  } else if (primaryResult) {
    stats = primaryResult as DashboardStats;
  } else {
    toast.error("Could not load dashboard stats");
    stats = applyBootstrapStats();
  }

  if (announcementsResult) dashboardAnnouncements = announcementsResult.slice(0, 5);

  return { stats, overview, activities, events, dashboardAnnouncements };
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

export function useDashboardData(args: UseDashboardDataArgs) {
  const cacheKey = `dashboard:${args.userId}:${args.role}`;
  const { data, initialLoading, refreshing, reload } = useStaleWhileRevalidate<DashboardSnapshot>(
    cacheKey,
    () => fetchDashboardSnapshot(args),
    {
      deps: [args.pastoral, args.hasAnnouncementsPage, args.members, args.cells, args.fellowships, args.departments],
    }
  );

  return {
    stats: data?.stats ?? EMPTY_STATS,
    overview: data?.overview ?? null,
    activities: data?.activities ?? [],
    events: data?.events ?? [],
    dashboardAnnouncements: data?.dashboardAnnouncements ?? [],
    initialLoading,
    refreshing,
    reload,
  };
}

export function clearDashboardDataCache() {
  clearPageDataCache();
}
