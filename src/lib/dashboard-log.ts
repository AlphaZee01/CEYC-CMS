import { authDebugEnabled } from "@/lib/auth-log";

type DashboardLogStats = {
  members: number;
  cells: number;
  fellowships: number;
  departments: number;
  lastCellMeeting: string | null;
};

type DashboardLogOverview = {
  showFinances?: boolean;
  counts?: {
    pendingPrayers?: number;
    pendingTasks?: number;
    pendingReports?: number;
    newMembersThisMonth?: number;
  };
  lastService?: { date: string; present: number; rate: number } | null;
  nextEvent?: { title: string } | null;
  serviceTrend?: unknown[];
};

type DashboardLogSnapshot = {
  stats: DashboardLogStats;
  overview: DashboardLogOverview | null;
  activities: { length: number } | unknown[];
  events: { length: number } | unknown[];
  dashboardAnnouncements: { length: number } | unknown[];
};

export const dashboardDebugEnabled = authDebugEnabled;

let traceStart = 0;

function line(step: string, ms: number, detail?: string, error = false) {
  if (!dashboardDebugEnabled) return;
  const suffix = detail ? ` — ${detail}` : "";
  console[error ? "error" : "log"](`[dashboard +${ms}ms] ${step}${suffix}`);
}

export function dashboardLogStart(label = "Dashboard load") {
  traceStart = performance.now();
  line(label, 0);
}

export function dashboardLog(step: string, detail?: string) {
  line(step, Math.round(performance.now() - traceStart), detail);
}

export function dashboardLogError(step: string, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  line(step, Math.round(performance.now() - traceStart), message, true);
}

export async function dashboardLogTimed<T>(step: string, fn: () => Promise<T>): Promise<T> {
  dashboardLog(step, "start");
  const t0 = performance.now();
  try {
    const result = await fn();
    dashboardLog(step, `ok ${Math.round(performance.now() - t0)}ms`);
    return result;
  } catch (err) {
    dashboardLogError(`${step} failed`, err);
    throw err;
  }
}

export function logDashboardSnapshot(
  meta: {
    role: string;
    pastoral: boolean;
    source: "api" | "fallback" | "cache";
    refreshing?: boolean;
  },
  snapshot: DashboardLogSnapshot
) {
  if (!dashboardDebugEnabled) return;

  const { stats, overview, activities, events, dashboardAnnouncements } = snapshot;
  const activityCount = Array.isArray(activities) ? activities.length : 0;
  const eventCount = Array.isArray(events) ? events.length : 0;
  const announcementCount = Array.isArray(dashboardAnnouncements) ? dashboardAnnouncements.length : 0;
  const counts = overview?.counts;
  const summary: Record<string, unknown> = {
    role: meta.role,
    pastoral: meta.pastoral,
    source: meta.source,
    refreshing: meta.refreshing ?? false,
    stats: {
      members: stats.members,
      cells: stats.cells,
      fellowships: stats.fellowships,
      departments: stats.departments,
      lastCellMeeting: stats.lastCellMeeting,
    },
    activities: activityCount,
    events: eventCount,
    announcements: announcementCount,
  };

  if (overview) {
    summary.overview = {
      showFinances: overview.showFinances,
      pendingPrayers: counts?.pendingPrayers,
      pendingTasks: counts?.pendingTasks,
      pendingReports: counts?.pendingReports,
      newMembersThisMonth: counts?.newMembersThisMonth,
      lastService: overview.lastService
        ? { date: overview.lastService.date, present: overview.lastService.present, rate: overview.lastService.rate }
        : null,
      nextEvent: overview.nextEvent?.title ?? null,
      serviceTrendPoints: overview.serviceTrend?.length ?? 0,
    };
  }

  dashboardLog("data ready", JSON.stringify(summary));
}

export function logDashboardStatsOnly(stats: DashboardLogStats, role: string) {
  if (!dashboardDebugEnabled) return;
  dashboardLog(
    "stats (non-pastoral)",
    JSON.stringify({ role, members: stats.members, cells: stats.cells, fellowships: stats.fellowships })
  );
}
