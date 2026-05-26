import { useState, useEffect, useCallback, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  Network,
  Building2,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  Pin,
  Upload,
  Play,
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Cake,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  UserCheck,
  UserX,
  FileText,
  CalendarDays,
  HandCoins,
  TrendingUp,
  TrendingDown,
  Heart,
  ClipboardList,
  AlertCircle,
  Church,
  UsersRound,
  UserPlus,
  ArrowLeft,
  Mail,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell as ChartCell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { toast } from "sonner";
import { api, exportCSV } from "@/lib/api";
import { changeSupabasePassword } from "@/lib/supabase";
import { useSupabaseForAuth } from "@/lib/auth-mode";
import { CURRENCY_SYMBOL, formatCurrency } from "@/lib/utils";
import { Card, Btn, Badge, Input, Select, Textarea, Modal, PageHeader, TabBar, ModalFooter, IconBox, AvatarCircle, cn } from "@/components/church/ui";
import { DashboardSkeleton, MemberListSkeleton } from "@/components/church/skeletons";
import { CHART_COLORS, ICON_TONES, ICON_TONE_LIST, pieSegmentColor, type IconTone } from "@/lib/icon-colors";
import { pageHeaderProps } from "@/lib/page-icons";
import {
  assignableRolesFor,
  canCreateMembers,
  canManageMember,
  canEditMemberProfile,
  canRecordServiceAttendance,
  canManageEvents,
  canManageDepartments,
  canManageEventsForUser,
  canManageTasksForUser,
  canPostAnnouncementsForUser,
  canSubmitDepartmentReport,
  canManagePrayerForUser,
  canManageDiscipleshipForUser,
  canRecordServiceAttendanceForUser,
  canConfirmEventProgramme,
  canEditCellAttendance,
  canApproveMedia,
  isCellScopedRole,
  membersPageSubtitle,
  canViewWelfareNotes,
  memberProfilePath,
} from "@/lib/rbac";
import { EventCalendar } from "@/components/church/EventCalendar";
import { AttendanceCalendarView, type AttendanceRecord } from "@/components/church/AttendanceCalendar";
import { ChatApp } from "@/components/church/ChatApp";
import { PAGE_META, type Member, type Cell, type Fellowship, type Department, type PageId, type Role } from "@/types/church";
import { useAuth } from "@/context/AuthContext";
import { DEPARTMENT_ABILITIES, ABILITY_LABELS, getPresetAbilitiesForName, type DepartmentAbility } from "@/lib/department-abilities";

export { CHART_COLORS };

export const PAGE_ACCESS: Record<Role, PageId[]> = {
  "Senior Pastor": PAGE_META.map((p) => p.id),
  "Associate Pastor": PAGE_META.map((p) => p.id).filter((id) => id !== "settings" && id !== "finances"),
  Admin: ["dashboard", "members", "attendance", "finances", "settings", "announcements", "tasks", "communications"],
  "Fellowship Leader": ["dashboard", "members", "cells", "attendance", "communications", "report-submissions", "announcements", "events"],
  "Cell Leader": ["dashboard", "members", "attendance", "communications", "report-submissions", "announcements", "events", "prayer", "media"],
  "Sub-cell Leader": ["dashboard", "members", "attendance", "communications", "announcements", "events", "report-submissions"],
  "Cell Member": ["dashboard", "communications", "prayer", "media", "announcements", "events"],
  "Church Member": ["dashboard", "communications", "prayer", "media", "announcements", "events"],
};

const ROLES: Role[] = [
  "Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader",
  "Cell Leader", "Sub-cell Leader", "Cell Member", "Church Member",
];

export interface ChurchSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

export interface PageProps {
  members: Member[];
  cells: Cell[];
  fellowships: Fellowship[];
  departments: Department[];
  settings: ChurchSettings;
  currentUser: Member;
  onRefresh: () => void;
}

function StatCard({ label, value, icon: Icon, tone = "blue", sub }: { label: string; value: string | number; icon: typeof Users; tone?: IconTone; sub?: string }) {
  const t = ICON_TONES[tone];
  return (
    <div className="surface-card-hover flex items-start justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{value}</p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </div>
      <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl", t.soft)}>
        <Icon className={cn("h-5 w-5", t.icon)} strokeWidth={2} />
      </div>
    </div>
  );
}

function DashboardSection({ title, icon: Icon, tone = "blue", children, className }: { title: string; icon: typeof Users; tone?: IconTone; children: ReactNode; className?: string }) {
  return (
    <div className={cn("surface-card p-4 sm:p-5", className)}>
      <div className="mb-5 flex items-center gap-3 border-b border-border pb-4">
        <IconBox icon={Icon} tone={tone} size="md" />
        <h2 className="text-base font-semibold tracking-tight text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  );
}

interface DashboardOverview {
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
  announcements: { id: string; title: string; pinned: boolean }[];
  birthdaysThisMonth: BirthdaysMonthSummary | null;
}

interface BirthdayCelebrant {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  dateOfBirth: string;
  day: number;
  dateLabel: string;
  turningAge: number;
  timing: "today" | "upcoming" | "past";
}

interface BirthdaysMonthSummary {
  year: number;
  month: number;
  monthLabel: string;
  count: number;
  celebrants: BirthdayCelebrant[];
}

function birthdayTimingBadge(timing: BirthdayCelebrant["timing"]) {
  if (timing === "today") return <Badge color="emerald">Today</Badge>;
  if (timing === "upcoming") return <Badge color="sky">Upcoming</Badge>;
  return <Badge color="gray">Celebrated</Badge>;
}

function BirthdaysModal({
  open,
  onClose,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  initial: BirthdaysMonthSummary;
}) {
  const [view, setView] = useState(initial);
  const [loading, setLoading] = useState(false);
  const now = new Date();
  const isCurrentMonth = view.year === now.getFullYear() && view.month === now.getMonth() + 1;

  useEffect(() => {
    if (open) setView(initial);
  }, [open, initial]);

  const loadMonth = async (year: number, month: number) => {
    setLoading(true);
    try {
      const data = await api<BirthdaysMonthSummary>(`/dashboard/birthdays?year=${year}&month=${month}`);
      setView(data);
    } finally {
      setLoading(false);
    }
  };

  const shift = (delta: number) => {
    const d = new Date(view.year, view.month - 1 + delta, 1);
    loadMonth(d.getFullYear(), d.getMonth() + 1);
  };

  return (
    <Modal open={open} onClose={onClose} title="Birthday Celebrants">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 rounded-xl bg-muted/40 p-2">
          <Btn variant="ghost" className="!min-h-[40px] !px-3" onClick={() => shift(-1)} disabled={loading}>
            <ChevronLeft className="h-4 w-4" />
          </Btn>
          <div className="text-center">
            <p className="font-semibold">{view.monthLabel}</p>
            <p className="text-xs text-muted-foreground">
              {isCurrentMonth ? "This month" : view.year < now.getFullYear() || (view.year === now.getFullYear() && view.month < now.getMonth() + 1) ? "Past month" : "Upcoming month"}
            </p>
          </div>
          <Btn variant="ghost" className="!min-h-[40px] !px-3" onClick={() => shift(1)} disabled={loading}>
            <ChevronRight className="h-4 w-4" />
          </Btn>
        </div>

        {loading ? (
          <div className="space-y-3 py-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : view.count === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No birthdays recorded for {view.monthLabel}.</p>
        ) : (
          <ul className="max-h-[min(24rem,55dvh)] space-y-2 overflow-y-auto pr-1">
            {view.celebrants.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <AvatarCircle name={c.name} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{c.name}</p>
                    {birthdayTimingBadge(c.timing)}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {c.dateLabel} · turning {c.turningAge}
                    {c.phone ? ` · ${c.phone}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

function BirthdaysSection({ summary }: { summary: BirthdaysMonthSummary }) {
  const [open, setOpen] = useState(false);
  const monthName = summary.monthLabel.split(" ")[0];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left transition hover:opacity-95"
      >
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-rose-500/5 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <IconBox icon={Cake} tone="violet" size="md" />
              <div>
                <h2 className="font-semibold">Birthdays — {monthName}</h2>
                <p className="text-sm text-muted-foreground">
                  {summary.count === 0
                    ? "No celebrants this month"
                    : `${summary.count} member${summary.count === 1 ? "" : "s"} celebrating`}
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
          </div>
          {summary.count > 0 ? (
            <ul className="space-y-2">
              {summary.celebrants.slice(0, 5).map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 rounded-lg bg-background/80 px-3 py-2 text-sm">
                  <div className="flex min-w-0 items-center gap-2">
                    <AvatarCircle name={c.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.dateLabel} · {c.role}</p>
                    </div>
                  </div>
                  {c.timing === "today" ? (
                    <Badge color="emerald">Today</Badge>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-violet-600">Day {c.day}</span>
                  )}
                </li>
              ))}
              {summary.count > 5 && (
                <p className="pt-1 text-center text-xs font-medium text-violet-600">
                  +{summary.count - 5} more — tap to browse all months
                </p>
              )}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Tap to browse birthdays in other months.</p>
          )}
        </Card>
      </button>
      <BirthdaysModal open={open} onClose={() => setOpen(false)} initial={summary} />
    </>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium", up ? "bg-accent/10 text-accent" : "bg-highlight/10 text-highlight")}>
      {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {up ? "+" : ""}{delta} vs last service
    </span>
  );
}

function PastorDashboard({
  overview,
  activities,
  events,
}: {
  overview: DashboardOverview;
  activities: { id: string; text: string; time: string }[];
  events: { id: string; title: string; date: string; time: string; rsvpIds: string[] }[];
}) {
  const { lastService, lastOffering, monthFinances, cellHealth, serviceTrend, lastServiceNewcomers } = overview;

  return (
    <div className="space-y-6">
      {/* Church at a glance */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Members" value={overview.counts.members} icon={Users} tone="indigo" sub={overview.counts.newMembersThisMonth ? `+${overview.counts.newMembersThisMonth} this month` : undefined} />
        <StatCard label="Cells" value={overview.counts.cells} icon={Network} tone="cyan" />
        <StatCard label="Fellowships" value={overview.counts.fellowships} icon={Building2} tone="violet" />
        {lastService ? (
          <StatCard label="Last Service" value={lastService.present} icon={Church} tone="blue" sub={`${lastService.rate}% attendance`} />
        ) : (
          <StatCard label="Last Service" value="—" icon={Church} tone="blue" sub="No records yet" />
        )}
        <StatCard label="Departments" value={overview.counts.departments} icon={Building2} tone="orange" />
        <StatCard label="Prayer Requests" value={overview.prayersSummary.pending} icon={Heart} tone="rose" sub="awaiting prayer" />
        {lastServiceNewcomers.total > 0 && (
          <StatCard label="New at Service" value={lastServiceNewcomers.total} icon={UserPlus} tone="emerald" sub="last Sunday" />
        )}
        {overview.showFinances && lastOffering && (
          <StatCard label="Last Offering" value={formatCurrency(lastOffering.total)} icon={HandCoins} tone="amber" sub={lastOffering.date} />
        )}
      </div>

      {/* Main situation cards */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <div className="space-y-4">
          <DashboardSection title="Last Service Attendance" icon={CalendarDays} tone="blue">
            {lastService ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-3xl font-bold text-primary">{lastService.present}</p>
                    <p className="text-sm text-muted-foreground">present on {lastService.date}</p>
                  </div>
                  <DeltaBadge delta={overview.attendanceDelta} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-accent/10 p-3">
                    <p className="text-lg font-semibold text-accent">{lastService.present}</p>
                    <p className="text-xs text-muted-foreground">Present</p>
                  </div>
                  <div className="rounded-lg bg-highlight/10 p-3">
                    <p className="text-lg font-semibold text-highlight">{lastService.absent}</p>
                    <p className="text-xs text-muted-foreground">Absent</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-lg font-semibold text-primary">{lastServiceNewcomers.total}</p>
                    <p className="text-xs text-muted-foreground">New</p>
                  </div>
                </div>
                {lastServiceNewcomers.total > 0 && (
                  <div className="rounded-lg border border-primary/15 bg-primary/5 p-3">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
                      <UserPlus className="h-3.5 w-3.5" />
                      New people at this service
                    </p>
                    <ul className="space-y-2">
                      {lastServiceNewcomers.members.map((p) => (
                        <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.role}{p.phone ? ` · ${p.phone}` : ""}</p>
                          </div>
                          <Badge color="teal">Member</Badge>
                        </li>
                      ))}
                      {lastServiceNewcomers.guests.map((g, i) => (
                        <li key={g.id ?? `guest-${i}-${g.name}`} className="flex items-center justify-between gap-2 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-medium">{g.name}</p>
                            {g.contact && <p className="text-xs text-muted-foreground">{g.contact}</p>}
                          </div>
                          <Badge color="coral">Guest</Badge>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {overview.previousService && (
                  <p className="text-xs text-muted-foreground">
                    Previous service ({overview.previousService.date}): {overview.previousService.present} present ({overview.previousService.rate}%)
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No service attendance recorded yet. Record attendance under the Attendance page.</p>
            )}
          </DashboardSection>

          {serviceTrend.length > 1 && (
            <DashboardSection title="Service Attendance Trend" icon={TrendingUp} tone="cyan">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={serviceTrend}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke={CHART_COLORS[0]} strokeWidth={2} dot={{ r: 4 }} name="Present" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </DashboardSection>
          )}
        </div>

        {overview.showFinances && (
          <div className="space-y-4">
            <DashboardSection title="Giving & Finances" icon={HandCoins} tone="emerald">
              {lastOffering ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Last service ({lastOffering.date})</p>
                    <p className="text-2xl font-bold text-primary">{formatCurrency(lastOffering.total)}</p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="font-semibold">{formatCurrency(lastOffering.tithe)}</p>
                      <p className="text-xs text-muted-foreground">Tithes</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="font-semibold">{formatCurrency(lastOffering.offering)}</p>
                      <p className="text-xs text-muted-foreground">Offering</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2">
                      <p className="font-semibold">{formatCurrency(lastOffering.seed)}</p>
                      <p className="text-xs text-muted-foreground">Seed</p>
                    </div>
                  </div>
                  {monthFinances && (
                    <div className="border-t border-border pt-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">This month</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span>Income: <strong className="text-accent">{formatCurrency(monthFinances.income)}</strong></span>
                        <span>Expenses: <strong className="text-highlight">{formatCurrency(monthFinances.expense)}</strong></span>
                        <span>Net: <strong>{formatCurrency(monthFinances.net)}</strong></span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No offering records yet.</p>
              )}
            </DashboardSection>
            {overview.birthdaysThisMonth && (
              <BirthdaysSection summary={overview.birthdaysThisMonth} />
            )}
          </div>
        )}

        {!overview.showFinances && overview.birthdaysThisMonth && (
          <BirthdaysSection summary={overview.birthdaysThisMonth} />
        )}

        <DashboardSection title="Cell Ministry" icon={UsersRound} tone="violet">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Avg. cell attendance (30 days)</span>
              <span className="font-semibold">{cellHealth.avgAttendance || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cell meetings recorded</span>
              <span className="font-semibold">{cellHealth.meetingsThisMonth}</span>
            </div>
            {cellHealth.topCell && (
              <div className="rounded-lg bg-accent/10 p-3">
                <p className="text-xs text-muted-foreground">Top performing cell</p>
                <p className="font-medium">{cellHealth.topCell.name}</p>
                <p className="text-sm">{cellHealth.topCell.present} present · {cellHealth.topCell.date}</p>
              </div>
            )}
            {overview.fellowshipCellAttendance.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">By fellowship (cell meetings)</p>
                {overview.fellowshipCellAttendance.map((f) => (
                  <div key={f.name} className="flex justify-between text-sm">
                    <span>{f.name}</span>
                    <span className="font-medium">{f.present} total</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DashboardSection>

        <DashboardSection title="Spiritual Care" icon={Heart} tone="rose">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-highlight/10 p-3">
              <p className="text-xl font-bold text-highlight">{overview.prayersSummary.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <p className="text-xl font-bold text-primary">{overview.prayersSummary.prayed}</p>
              <p className="text-xs text-muted-foreground">Prayed</p>
            </div>
            <div className="rounded-lg bg-accent/10 p-3">
              <p className="text-xl font-bold text-accent">{overview.prayersSummary.answered}</p>
              <p className="text-xs text-muted-foreground">Answered</p>
            </div>
          </div>
          {overview.followUpsByStage.length > 0 && (
            <div className="mt-4 space-y-1.5 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">Discipleship pipeline ({overview.counts.activeFollowUps} total)</p>
              {overview.followUpsByStage.map((s) => (
                <div key={s.stage} className="flex justify-between text-sm">
                  <span>{s.stage}</span>
                  <Badge color="purple">{s.count}</Badge>
                </div>
              ))}
            </div>
          )}
        </DashboardSection>

        <DashboardSection title="Operations" icon={ClipboardList} tone="amber">
          <div className="mb-3 flex flex-wrap gap-2">
            {overview.counts.overdueTasks > 0 && (
              <Badge color="coral"><AlertCircle className="mr-1 inline h-3 w-3" />{overview.counts.overdueTasks} overdue tasks</Badge>
            )}
            {overview.counts.pendingReports > 0 && (
              <Badge color="teal">{overview.counts.pendingReports} reports to review</Badge>
            )}
          </div>
          {overview.tasksDue.length > 0 ? (
            <ul className="space-y-2">
              {overview.tasksDue.map((t) => (
                <li key={t.id} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span className="truncate pr-2">{t.title}</span>
                  <Badge color={t.priority === "high" ? "coral" : "gray"}>{t.dueDate}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No open tasks.</p>
          )}
          {overview.pendingReports.length > 0 && (
            <div className="mt-4 border-t border-border pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Reports awaiting review</p>
              <ul className="space-y-2">
                {overview.pendingReports.map((r) => (
                  <li key={r.id} className="rounded-lg bg-muted/40 px-3 py-2 text-sm">
                    <p className="font-medium capitalize">{r.type} report · {r.period}</p>
                    <p className="text-xs text-muted-foreground">{r.submitterName} · {r.attendanceCount} attended · {r.newVisitors} visitors</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </DashboardSection>

        {overview.nextEvent && (
          <DashboardSection title="Next Event" icon={CalendarDays} tone="orange">
            <p className="text-lg font-semibold">{overview.nextEvent.title}</p>
            <p className="text-sm text-muted-foreground">{overview.nextEvent.date} · {overview.nextEvent.time}</p>
            {overview.nextEvent.location && <p className="text-sm text-muted-foreground">{overview.nextEvent.location}</p>}
            <Badge color="teal" className="mt-2">{overview.nextEvent.rsvpCount} RSVPs</Badge>
          </DashboardSection>
        )}
      </div>

      {/* Announcements strip */}
      {overview.announcements.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {overview.announcements.map((a) => (
            <Card key={a.id} className={cn("p-4", a.pinned && "border-primary/30 bg-primary/5")}>
              <div className="flex items-start gap-2">
                {a.pinned && <Pin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
                <p className="text-sm font-medium">{a.title}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          <ul className="space-y-3">
            {activities.map((a, i) => (
              <li key={a.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
                <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", ICON_TONES[ICON_TONE_LIST[i % ICON_TONE_LIST.length]].solid)} />
                <div>
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
            {activities.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Upcoming Events</h2>
          {events.slice(0, 5).map((e) => (
            <div key={e.id} className="mb-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">{e.date} · {e.time}</p>
              </div>
              <Badge color="teal">{e.rsvpIds.length} RSVP</Badge>
            </div>
          ))}
          {events.length === 0 && <p className="text-sm text-muted-foreground">No upcoming events</p>}
        </Card>
      </div>
    </div>
  );
}

function memberName(members: Member[], id: string | null | undefined) {
  if (!id) return "—";
  return members.find((m) => m.id === id)?.name || "—";
}

function MemberNameLink({
  members,
  id,
  className,
}: {
  members: Member[];
  id: string | null | undefined;
  className?: string;
}) {
  const navigate = useNavigate();
  if (!id) return <span className={className}>—</span>;
  const m = members.find((x) => x.id === id);
  if (!m) return <span className={className}>—</span>;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        navigate(memberProfilePath(id));
      }}
      className={cn("text-left font-medium text-primary hover:underline", className)}
    >
      {m.name}
    </button>
  );
}

function formatMemberDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso.includes("T") ? iso : `${iso}T12:00:00`).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function isPastoral(role: Role) {
  return role === "Senior Pastor" || role === "Associate Pastor";
}

function canAccessFinances(role: Role) {
  return role === "Senior Pastor" || role === "Admin";
}

function canManageStructure(role: Role) {
  return ["Senior Pastor", "Associate Pastor", "Admin", "Fellowship Leader"].includes(role);
}

function canManageSettings(role: Role) {
  return role === "Senior Pastor" || role === "Admin";
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage({ members, cells, currentUser }: PageProps) {
  const pastoral = isPastoral(currentUser.role) || currentUser.role === "Admin";
  const cellScoped = isCellScopedRole(currentUser.role);
  const myCell = cells.find((c) => c.id === currentUser.cellId);
  const [stats, setStats] = useState({
    members: 0,
    cells: 0,
    fellowships: 0,
    departments: 0,
    lastCellMeeting: null as string | null,
  });
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [activities, setActivities] = useState<{ id: string; text: string; time: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time: string; rsvpIds: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const requests: Promise<void>[] = [
      api<typeof activities>("/activities").then(setActivities).catch(() => {}),
    ];
    if (pastoral) {
      requests.push(api<DashboardOverview>("/dashboard/overview").then(setOverview).catch(() => {}));
    } else {
      requests.push(api<typeof stats>("/dashboard/stats").then(setStats).catch(() => {}));
    }
    if (currentUser.role !== "Cell Member" && currentUser.role !== "Church Member") {
      requests.push(api<typeof events>("/events").then(setEvents).catch(() => {}));
    }
    Promise.all(requests).finally(() => setLoading(false));
  }, [currentUser.role, pastoral]);

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("dashboard")}
        title="Dashboard"
        subtitle={
          pastoral
            ? `Church overview · Welcome, ${currentUser.name} · ${currentUser.role}`
            : `Welcome back, ${currentUser.name} · ${currentUser.role}`
        }
      />
      {loading ? (
        <DashboardSkeleton pastoral={pastoral} />
      ) : pastoral && overview ? (
        <PastorDashboard overview={overview} activities={activities} events={events} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {cellScoped ? (
              <>
                <StatCard label="Cell Members" value={stats.members} icon={Users} tone="indigo" sub={myCell?.name} />
                <StatCard
                  label="Last Cell Meeting"
                  value={stats.lastCellMeeting ? new Date(stats.lastCellMeeting).toLocaleDateString() : "—"}
                  icon={CalendarDays}
                  tone="cyan"
                />
                <StatCard label="Your Cell" value={myCell?.name || "—"} icon={Network} tone="violet" />
                <StatCard label="Your Role" value={currentUser.role} icon={UserCheck} tone="orange" />
              </>
            ) : (
              <>
                <StatCard label="Total Members" value={stats.members} icon={Users} tone="indigo" />
                <StatCard label="Cells" value={stats.cells} icon={Network} tone="cyan" />
                <StatCard label="Fellowships" value={stats.fellowships} icon={Building2} tone="violet" />
                <StatCard label="Departments" value={stats.departments} icon={Building2} tone="orange" />
              </>
            )}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Recent Activity</h2>
              <ul className="space-y-3">
                {activities.map((a, i) => (
                  <li key={a.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
                    <div className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", ICON_TONES[ICON_TONE_LIST[i % ICON_TONE_LIST.length]].solid)} />
                    <div>
                      <p className="text-sm">{a.text}</p>
                      <p className="text-xs text-muted-foreground">{a.time}</p>
                    </div>
                  </li>
                ))}
                {activities.length === 0 && <p className="text-sm text-muted-foreground">No recent activity</p>}
              </ul>
            </Card>
            {events.length > 0 && (
              <Card>
                <h2 className="mb-4 font-semibold">Upcoming Events</h2>
                {events.slice(0, 5).map((e) => (
                  <div key={e.id} className="mb-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div>
                      <p className="font-medium">{e.title}</p>
                      <p className="text-xs text-muted-foreground">{e.date} · {e.time}</p>
                    </div>
                    <Badge color="teal">{e.rsvpIds.length} RSVP</Badge>
                  </div>
                ))}
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Members ───────────────────────────────────────────────────────────────────

export function MembersPage({ members, cells, fellowships, departments, currentUser, onRefresh }: PageProps) {
  const navigate = useNavigate();
  const cellScoped = isCellScopedRole(currentUser.role);
  const myCell = cells.find((c) => c.id === currentUser.cellId);
  const roleOptions = assignableRolesFor(currentUser.role);
  const [list, setList] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterCell, setFilterCell] = useState(cellScoped ? currentUser.cellId || "" : "");
  const [filterFellowship, setFilterFellowship] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [modal, setModal] = useState<"add" | "edit" | null>(null);
  const [edit, setEdit] = useState<Partial<Member> & { password?: string }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterRole) params.set("role", filterRole);
    if (filterCell) params.set("cellId", filterCell);
    if (filterFellowship) params.set("fellowshipId", filterFellowship);
    if (filterDept) params.set("departmentId", filterDept);
    setLoading(true);
    api<Member[]>(`/members?${params}`)
      .then(setList)
      .catch(() => setList(members))
      .finally(() => setLoading(false));
  }, [search, filterRole, filterCell, filterFellowship, filterDept, members]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const saveMember = async () => {
    if (!edit.name || !edit.email) return;
    setSaving(true);
    try {
      if (modal === "add") {
        await api("/members", {
          method: "POST",
          body: JSON.stringify({
            name: edit.name,
            email: edit.email,
            phone: edit.phone || "",
            role: edit.role || "Church Member",
            cellId: edit.cellId || null,
            fellowshipId: edit.fellowshipId || null,
            departmentIds: edit.departmentIds || [],
            password: edit.password,
            dateOfBirth: edit.dateOfBirth || null,
          }),
        });
      } else if (edit.id) {
        await api(`/members/${edit.id}`, {
          method: "PUT",
          body: JSON.stringify({
            name: edit.name,
            email: edit.email,
            phone: edit.phone,
            role: edit.role,
            cellId: edit.cellId,
            fellowshipId: edit.fellowshipId,
            departmentIds: edit.departmentIds,
            dateOfBirth: edit.dateOfBirth || null,
          }),
        });
        if (["Senior Pastor", "Admin"].includes(currentUser.role) && edit.welfareNotes !== undefined) {
          await api(`/members/${edit.id}/welfare`, { method: "PATCH", body: JSON.stringify({ welfareNotes: edit.welfareNotes }) });
        }
      }
      setModal(null);
      setEdit({});
      load();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deactivate = async (m: Member) => {
    if (!confirm(`Deactivate ${m.name}?`)) return;
    try {
      await api(`/members/${m.id}`, { method: "PUT", body: JSON.stringify({ active: false }) });
      load();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("members")}
        title="Members"
        subtitle={membersPageSubtitle(currentUser.role, myCell?.name)}
        action={
          canCreateMembers(currentUser.role) ? (
            <Btn
              onClick={() => {
                setEdit({
                  role: cellScoped ? "Cell Member" : "Church Member",
                  active: true,
                  departmentIds: [],
                  ...(cellScoped ? { cellId: currentUser.cellId, fellowshipId: currentUser.fellowshipId } : {}),
                });
                setModal("add");
              }}
            >
              <Plus className="h-4 w-4" /> Add Member
            </Btn>
          ) : undefined
        }
      />
      <div className={cn("grid grid-cols-1 gap-3 sm:grid-cols-2", cellScoped ? "lg:grid-cols-3" : "lg:grid-cols-5")}>
        <div className={cn("relative", cellScoped ? "lg:col-span-2" : "lg:col-span-2")}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="w-full min-h-[44px] rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-base shadow-sm transition focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 sm:text-sm" />
        </div>
        <Select
          value={filterRole}
          onChange={setFilterRole}
          options={[
            { value: "", label: "All roles" },
            ...(cellScoped ? roleOptions : ROLES).map((r) => ({ value: r, label: r })),
          ]}
        />
        {!cellScoped && (
          <>
            <Select value={filterCell} onChange={setFilterCell} options={[{ value: "", label: "All cells" }, ...cells.map((c) => ({ value: c.id, label: c.name }))]} />
            <Select value={filterFellowship} onChange={setFilterFellowship} options={[{ value: "", label: "All fellowships" }, ...fellowships.map((f) => ({ value: f.id, label: f.name }))]} />
            <Select value={filterDept} onChange={setFilterDept} options={[{ value: "", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
          </>
        )}
      </div>
      {loading ? (
        <MemberListSkeleton />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {list.map((m) => (
              <Card key={m.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => navigate(memberProfilePath(m.id))}
                      className="font-medium text-primary hover:underline"
                    >
                      {m.name}
                    </button>
                    <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge color="purple">{m.role}</Badge>
                      {m.cellId && <Badge color="gray">{cells.find((c) => c.id === m.cellId)?.name}</Badge>}
                    </div>
                  </div>
                  {canManageMember(currentUser, m) && (
                    <div className="flex shrink-0 gap-1">
                      <button type="button" className="touch-target flex items-center justify-center rounded-lg hover:bg-muted" onClick={() => { setEdit(m); setModal("edit"); }} aria-label="Edit member">
                        <Edit className="h-4 w-4" />
                      </button>
                      <button type="button" className="touch-target flex items-center justify-center rounded-lg text-destructive hover:bg-muted" onClick={() => deactivate(m)} aria-label="Deactivate member">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
            {list.length === 0 && <Card><p className="text-sm text-muted-foreground">No members found</p></Card>}
          </div>
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="hidden px-4 py-3 text-left md:table-cell">Cell</th>
                  <th className="hidden px-4 py-3 text-left lg:table-cell">Fellowship</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => navigate(memberProfilePath(m.id))}
                        className="font-medium text-primary hover:underline"
                      >
                        {m.name}
                      </button>
                      <p className="text-xs text-muted-foreground">{m.email}</p>
                    </td>
                    <td className="px-4 py-3"><Badge color="purple">{m.role}</Badge></td>
                    <td className="hidden px-4 py-3 md:table-cell">{cells.find((c) => c.id === m.cellId)?.name || "—"}</td>
                    <td className="hidden px-4 py-3 lg:table-cell">{fellowships.find((f) => f.id === m.fellowshipId)?.name || "—"}</td>
                    <td className="px-4 py-3 text-right">
                      {canManageMember(currentUser, m) && (
                        <div className="flex justify-end gap-1">
                          <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => { setEdit(m); setModal("edit"); }}>
                            <Edit className="h-4 w-4" />
                          </button>
                          <button type="button" className="rounded p-1 text-destructive hover:bg-muted" onClick={() => deactivate(m)}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "add" ? "Add Member" : "Edit Member"}>
        <div className="space-y-3">
          <Input label="Full Name" value={edit.name || ""} onChange={(v) => setEdit((e) => ({ ...e, name: v }))} />
          <Input label="Email" value={edit.email || ""} onChange={(v) => setEdit((e) => ({ ...e, email: v }))} />
          <Input label="Phone" value={edit.phone || ""} onChange={(v) => setEdit((e) => ({ ...e, phone: v }))} />
          <Input label="Date of birth" type="date" value={edit.dateOfBirth || ""} onChange={(v) => setEdit((e) => ({ ...e, dateOfBirth: v || null }))} />
          {modal === "add" && <Input label="Password (optional)" type="password" value={edit.password || ""} onChange={(v) => setEdit((e) => ({ ...e, password: v }))} />}
          <Select
            label="Role"
            value={edit.role || "Church Member"}
            onChange={(v) => setEdit((e) => ({ ...e, role: v as Role }))}
            options={(modal === "add" || canManageMember(currentUser, edit as Member) ? roleOptions : ROLES).map((r) => ({ value: r, label: r }))}
          />
          {cellScoped ? (
            <>
              <Input label="Cell" value={myCell?.name || "Your cell"} disabled onChange={() => {}} />
              <Input
                label="Fellowship"
                value={fellowships.find((f) => f.id === currentUser.fellowshipId)?.name || "—"}
                disabled
                onChange={() => {}}
              />
            </>
          ) : (
            <>
              <Select label="Cell" value={edit.cellId || ""} onChange={(v) => setEdit((e) => ({ ...e, cellId: v || null }))} options={[{ value: "", label: "None" }, ...cells.map((c) => ({ value: c.id, label: c.name }))]} />
              <Select label="Fellowship" value={edit.fellowshipId || ""} onChange={(v) => setEdit((e) => ({ ...e, fellowshipId: v || null }))} options={[{ value: "", label: "None" }, ...fellowships.map((f) => ({ value: f.id, label: f.name }))]} />
            </>
          )}
          {["Senior Pastor", "Admin"].includes(currentUser.role) && modal === "edit" && edit.id && (
            <Textarea label="Welfare / pastoral notes (Admin)" value={edit.welfareNotes || ""} onChange={(v) => setEdit((e) => ({ ...e, welfareNotes: v }))} />
          )}
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={saveMember} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

// ─── Member profile ────────────────────────────────────────────────────────────

export function MemberProfilePage({
  memberId,
  members,
  cells,
  fellowships,
  departments,
  currentUser,
  onRefresh,
}: PageProps & { memberId: string }) {
  const navigate = useNavigate();
  const { refresh: refreshAuth } = useAuth();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [edit, setEdit] = useState<Partial<Member>>({});
  const [saving, setSaving] = useState(false);
  const isOwn = currentUser.id === memberId;
  const roleOptions = assignableRolesFor(currentUser.role);
  const cellScoped = isCellScopedRole(currentUser.role);
  const myCell = cells.find((c) => c.id === currentUser.cellId);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    api<Member>(`/members/${memberId}`)
      .then(setMember)
      .catch((e) => {
        setMember(null);
        setError(e instanceof Error ? e.message : "Failed to load profile");
      })
      .finally(() => setLoading(false));
  }, [memberId]);

  useEffect(() => {
    load();
  }, [load]);

  const saveMember = async () => {
    if (!edit.id || !edit.name || !edit.email) return;
    const editingSelf = edit.id === currentUser.id;
    setSaving(true);
    try {
      const body = editingSelf
        ? {
            name: edit.name,
            email: edit.email,
            phone: edit.phone ?? "",
            dateOfBirth: edit.dateOfBirth || null,
          }
        : {
            name: edit.name,
            email: edit.email,
            phone: edit.phone,
            role: edit.role,
            cellId: edit.cellId,
            fellowshipId: edit.fellowshipId,
            departmentIds: edit.departmentIds,
            dateOfBirth: edit.dateOfBirth || null,
          };
      await api(`/members/${edit.id}`, { method: "PUT", body: JSON.stringify(body) });
      if (!editingSelf && canViewWelfareNotes(currentUser.role) && edit.welfareNotes !== undefined) {
        await api(`/members/${edit.id}/welfare`, {
          method: "PATCH",
          body: JSON.stringify({ welfareNotes: edit.welfareNotes }),
        });
      }
      setEditOpen(false);
      load();
      onRefresh();
      if (editingSelf) await refreshAuth();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const backTo = () => {
    if (isOwn && !PAGE_ACCESS[currentUser.role].includes("members")) {
      navigate("/app");
    } else {
      navigate("/app/members");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Btn variant="ghost" onClick={backTo}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Btn>
        <MemberListSkeleton />
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <Btn variant="ghost" onClick={backTo}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Btn>
        <Card>
          <p className="text-sm text-destructive">{error || "Member not found"}</p>
        </Card>
      </div>
    );
  }

  const cell = cells.find((c) => c.id === member.cellId);
  const fellowship = fellowships.find((f) => f.id === member.fellowshipId);
  const deptNames = member.departmentIds
    .map((id) => departments.find((d) => d.id === id)?.name)
    .filter(Boolean) as string[];
  const canEdit = canEditMemberProfile(currentUser, member);
  const canManage = canManageMember(currentUser, member);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Btn variant="ghost" onClick={backTo}>
          <ArrowLeft className="h-4 w-4" /> Back
        </Btn>
        {canEdit && (
          <Btn
            variant="secondary"
            onClick={() => {
              setEdit(member);
              setEditOpen(true);
            }}
          >
            <Edit className="h-4 w-4" /> {isOwn ? "Edit profile" : "Edit member"}
          </Btn>
        )}
      </div>

      <Card className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
        <AvatarCircle name={member.name} size="lg" variant="solid" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{member.name}</h1>
          <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Badge color="purple">{member.role}</Badge>
            {!member.active && <Badge color="rose">Inactive</Badge>}
            {isOwn && <Badge color="sky">Your profile</Badge>}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Mail className="h-4 w-4" /> Contact
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="font-medium break-all">{member.email || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{member.phone || "—"}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <Cake className="h-3.5 w-3.5" /> Date of birth
              </dt>
              <dd className="font-medium">{formatMemberDate(member.dateOfBirth)}</dd>
            </div>
            <div>
              <dt className="flex items-center gap-1 text-muted-foreground">
                <CalendarDays className="h-3.5 w-3.5" /> Joined
              </dt>
              <dd className="font-medium">{formatMemberDate(member.joinedAt)}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Network className="h-4 w-4" /> Church structure
          </h2>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Cell</dt>
              <dd className="font-medium">{cell?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fellowship</dt>
              <dd className="font-medium">{fellowship?.name || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Departments</dt>
              <dd className="font-medium">
                {deptNames.length ? (
                  <ul className="mt-1 list-inside list-disc">
                    {deptNames.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                  </ul>
                ) : (
                  "—"
                )}
              </dd>
            </div>
          </dl>
        </Card>
      </div>

      {member.welfareNotes && canViewWelfareNotes(currentUser.role) && !isOwn && (
        <Card>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pastoral / welfare notes
          </h2>
          <p className="whitespace-pre-wrap text-sm">{member.welfareNotes}</p>
        </Card>
      )}

      {isOwn && (
        <Card className="border-dashed">
          <p className="text-sm text-muted-foreground">
            Use <strong className="text-foreground">Edit profile</strong> to update your name, email, phone, and date of
            birth. To change your login password, go to Settings. Contact your cell or fellowship leader to update your
            role or cell assignment.
          </p>
        </Card>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title={isOwn ? "Edit your profile" : "Edit member"}>
        <div className="space-y-3">
          <Input label="Full Name" value={edit.name || ""} onChange={(v) => setEdit((e) => ({ ...e, name: v }))} />
          <Input label="Email" value={edit.email || ""} onChange={(v) => setEdit((e) => ({ ...e, email: v }))} />
          <Input label="Phone" value={edit.phone || ""} onChange={(v) => setEdit((e) => ({ ...e, phone: v }))} />
          <Input
            label="Date of birth"
            type="date"
            value={edit.dateOfBirth || ""}
            onChange={(v) => setEdit((e) => ({ ...e, dateOfBirth: v || null }))}
          />
          {canManage && (
            <>
              <Select
                label="Role"
                value={edit.role || "Church Member"}
                onChange={(v) => setEdit((e) => ({ ...e, role: v as Role }))}
                options={roleOptions.map((r) => ({ value: r, label: r }))}
              />
              {cellScoped ? (
                <>
                  <Input label="Cell" value={myCell?.name || "Your cell"} disabled onChange={() => {}} />
                  <Input
                    label="Fellowship"
                    value={fellowships.find((f) => f.id === currentUser.fellowshipId)?.name || "—"}
                    disabled
                    onChange={() => {}}
                  />
                </>
              ) : (
                <>
                  <Select
                    label="Cell"
                    value={edit.cellId || ""}
                    onChange={(v) => setEdit((e) => ({ ...e, cellId: v || null }))}
                    options={[{ value: "", label: "None" }, ...cells.map((c) => ({ value: c.id, label: c.name }))]}
                  />
                  <Select
                    label="Fellowship"
                    value={edit.fellowshipId || ""}
                    onChange={(v) => setEdit((e) => ({ ...e, fellowshipId: v || null }))}
                    options={[{ value: "", label: "None" }, ...fellowships.map((f) => ({ value: f.id, label: f.name }))]}
                  />
                </>
              )}
              {canViewWelfareNotes(currentUser.role) && (
                <Textarea
                  label="Welfare / pastoral notes"
                  value={edit.welfareNotes || ""}
                  onChange={(v) => setEdit((e) => ({ ...e, welfareNotes: v }))}
                />
              )}
            </>
          )}
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setEditOpen(false)}>
              Cancel
            </Btn>
            <Btn onClick={saveMember} disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Btn>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

// ─── Cells ─────────────────────────────────────────────────────────────────────

export function CellsPage({ members, cells: propCells, fellowships: propFellowships, currentUser, onRefresh }: PageProps) {
  const [fellowships, setFellowships] = useState(propFellowships);
  const [cells, setCells] = useState(propCells);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [felModal, setFelModal] = useState(false);
  const [cellModal, setCellModal] = useState(false);
  const [newFel, setNewFel] = useState({ name: "", leaderId: "" });
  const [newCell, setNewCell] = useState({ name: "", fellowshipId: propFellowships[0]?.id || "", leaderId: "", subLeaderId: "" });
  const [assignModal, setAssignModal] = useState<{ type: "fellowship" | "cell"; id: string } | null>(null);
  const [assignLeader, setAssignLeader] = useState("");
  const [assignSubLeader, setAssignSubLeader] = useState("");
  const [membersModal, setMembersModal] = useState<{ cellId: string; cellName: string } | null>(null);
  const [cellMemberIds, setCellMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [savingMembers, setSavingMembers] = useState(false);

  const load = useCallback(() => {
    Promise.all([api<Fellowship[]>("/fellowships"), api<Cell[]>("/cells")])
      .then(([f, c]) => { setFellowships(f); setCells(c); })
      .catch(() => { setFellowships(propFellowships); setCells(propCells); });
  }, [propFellowships, propCells]);

  useEffect(() => { load(); }, [load]);

  const createFellowship = async () => {
    if (!newFel.name) return;
    await api("/fellowships", { method: "POST", body: JSON.stringify({ name: newFel.name, leaderId: newFel.leaderId || null }) });
    setFelModal(false);
    setNewFel({ name: "", leaderId: "" });
    load();
    onRefresh();
  };

  const createCell = async () => {
    if (!newCell.name || !newCell.fellowshipId) return;
    await api("/cells", {
      method: "POST",
      body: JSON.stringify({
        name: newCell.name,
        fellowshipId: newCell.fellowshipId,
        leaderId: newCell.leaderId || null,
        subLeaderId: newCell.subLeaderId || null,
      }),
    });
    setCellModal(false);
    setNewCell({ name: "", fellowshipId: fellowships[0]?.id || "", leaderId: "", subLeaderId: "" });
    load();
    onRefresh();
  };

  const saveAssignment = async () => {
    if (!assignModal) return;
    if (assignModal.type === "fellowship") {
      await api(`/fellowships/${assignModal.id}`, { method: "PUT", body: JSON.stringify({ leaderId: assignLeader || null }) });
    } else {
      await api(`/cells/${assignModal.id}`, {
        method: "PUT",
        body: JSON.stringify({ leaderId: assignLeader || null, subLeaderId: assignSubLeader || null }),
      });
    }
    setAssignModal(null);
    load();
    onRefresh();
  };

  const openMembersModal = (cell: Cell) => {
    setMembersModal({ cellId: cell.id, cellName: cell.name });
    setCellMemberIds(members.filter((m) => m.cellId === cell.id && m.active).map((m) => m.id));
    setMemberSearch("");
  };

  const saveCellMembers = async () => {
    if (!membersModal) return;
    setSavingMembers(true);
    try {
      await api(`/cells/${membersModal.cellId}/members`, {
        method: "PUT",
        body: JSON.stringify({ memberIds: cellMemberIds }),
      });
      setMembersModal(null);
      onRefresh();
    } finally {
      setSavingMembers(false);
    }
  };

  const removeFromCell = async (cellId: string, memberId: string) => {
    const current = members.filter((m) => m.cellId === cellId && m.active).map((m) => m.id);
    await api(`/cells/${cellId}/members`, {
      method: "PUT",
      body: JSON.stringify({ memberIds: current.filter((id) => id !== memberId) }),
    });
    onRefresh();
  };

  const assignableMembers = members
    .filter((m) => m.active)
    .filter((m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.email.toLowerCase().includes(memberSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("cells")}
        title="Cells & Fellowships"
        subtitle="Manage structure and leadership"
        action={
          canManageStructure(currentUser.role) ? (
            <div className="flex gap-2">
              <Btn variant="secondary" onClick={() => setFelModal(true)}><Plus className="h-4 w-4" /> Fellowship</Btn>
              <Btn onClick={() => setCellModal(true)}><Plus className="h-4 w-4" /> Cell</Btn>
            </div>
          ) : undefined
        }
      />
      {fellowships.map((f) => (
        <Card key={f.id}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-primary">{f.name}</h2>
              <p className="text-sm text-muted-foreground">
                Leader: <MemberNameLink members={members} id={f.leaderId} className="inline font-normal" />
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="teal">{cells.filter((c) => c.fellowshipId === f.id).length} cells</Badge>
              {canManageStructure(currentUser.role) && (
                <Btn variant="ghost" className="!px-2 !py-1" onClick={() => { setAssignModal({ type: "fellowship", id: f.id }); setAssignLeader(f.leaderId || ""); }}>
                  <Edit className="h-4 w-4" />
                </Btn>
              )}
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {cells.filter((c) => c.fellowshipId === f.id).map((c) => {
              const cellMembers = members.filter((m) => m.cellId === c.id && m.active);
              return (
                <div key={c.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{c.name}</h3>
                    <button type="button" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
                      <ChevronRight className={cn("h-4 w-4 transition", expanded === c.id && "rotate-90")} />
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leader: <MemberNameLink members={members} id={c.leaderId} className="inline font-normal" /> · Sub:{" "}
                    <MemberNameLink members={members} id={c.subLeaderId} className="inline font-normal" /> · {cellMembers.length} members
                  </p>
                  {canManageStructure(currentUser.role) && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Btn variant="ghost" className="!px-0 !py-1 text-xs" onClick={() => {
                        setAssignModal({ type: "cell", id: c.id });
                        setAssignLeader(c.leaderId || "");
                        setAssignSubLeader(c.subLeaderId || "");
                      }}>Assign leaders</Btn>
                      <Btn variant="ghost" className="!px-0 !py-1 text-xs" onClick={() => openMembersModal(c)}>
                        <UserPlus className="h-3.5 w-3.5" /> Add members
                      </Btn>
                    </div>
                  )}
                  {expanded === c.id && (
                    <ul className="mt-3 space-y-1 border-t pt-2 text-sm">
                      {cellMembers.length === 0 && (
                        <li className="text-xs text-muted-foreground">No members yet. Use Add members to assign people to this cell.</li>
                      )}
                      {cellMembers.map((m) => (
                        <li key={m.id} className="flex items-center justify-between gap-2">
                          <span>{m.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge color="gray">{m.role}</Badge>
                            {canManageStructure(currentUser.role) && (
                              <button
                                type="button"
                                className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                                title="Remove from cell"
                                onClick={() => removeFromCell(c.id, m.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      ))}
      <Modal open={felModal} onClose={() => setFelModal(false)} title="New Fellowship">
        <div className="space-y-3">
          <Input label="Name" value={newFel.name} onChange={(v) => setNewFel((f) => ({ ...f, name: v }))} />
          <Select label="Leader" value={newFel.leaderId} onChange={(v) => setNewFel((f) => ({ ...f, leaderId: v }))} options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          <Btn onClick={createFellowship}>Create</Btn>
        </div>
      </Modal>
      <Modal open={cellModal} onClose={() => setCellModal(false)} title="New Cell">
        <div className="space-y-3">
          <Input label="Name" value={newCell.name} onChange={(v) => setNewCell((c) => ({ ...c, name: v }))} />
          <Select label="Fellowship" value={newCell.fellowshipId} onChange={(v) => setNewCell((c) => ({ ...c, fellowshipId: v }))} options={fellowships.map((f) => ({ value: f.id, label: f.name }))} />
          <Select label="Leader" value={newCell.leaderId} onChange={(v) => setNewCell((c) => ({ ...c, leaderId: v }))} options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          <Btn onClick={createCell}>Create</Btn>
        </div>
      </Modal>
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title="Assign Leaders">
        <div className="space-y-3">
          <Select label="Leader" value={assignLeader} onChange={setAssignLeader} options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          {assignModal?.type === "cell" && (
            <Select label="Sub-cell Leader" value={assignSubLeader} onChange={setAssignSubLeader} options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          )}
          <Btn onClick={saveAssignment}>Save</Btn>
        </div>
      </Modal>
      <Modal open={!!membersModal} onClose={() => setMembersModal(null)} title={membersModal ? `Members — ${membersModal.cellName}` : "Cell members"}>
        <div className="space-y-3">
          <Input label="Search" value={memberSearch} onChange={setMemberSearch} placeholder="Name or email" />
          <p className="text-xs text-muted-foreground">
            {cellMemberIds.length} selected · check members to add or remove from this cell
          </p>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-lg border p-2">
            {assignableMembers.map((m) => {
              const inOtherCell = m.cellId && m.cellId !== membersModal?.cellId;
              const otherCellName = inOtherCell ? cells.find((c) => c.id === m.cellId)?.name : null;
              return (
                <label key={m.id} className="flex items-start gap-2 rounded-md p-1.5 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={cellMemberIds.includes(m.id)}
                    onChange={(e) => {
                      setCellMemberIds((ids) =>
                        e.target.checked ? [...ids, m.id] : ids.filter((id) => id !== m.id)
                      );
                    }}
                  />
                  <span>
                    <span className="font-medium">{m.name}</span>
                    {otherCellName && (
                      <span className="ml-1 text-xs text-amber-600">(moves from {otherCellName})</span>
                    )}
                    <span className="block text-xs text-muted-foreground">{m.role}{m.email ? ` · ${m.email}` : ""}</span>
                  </span>
                </label>
              );
            })}
            {assignableMembers.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No members match your search.</p>
            )}
          </div>
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setMembersModal(null)}>Cancel</Btn>
            <Btn onClick={saveCellMembers} disabled={savingMembers}>{savingMembers ? "Saving..." : "Save members"}</Btn>
          </ModalFooter>
        </div>
      </Modal>
    </div>
  );
}

// ─── Departments ───────────────────────────────────────────────────────────────

export function DepartmentsPage({ members, departments: propDepts, currentUser, onRefresh }: PageProps) {
  const { refresh: refreshAuth } = useAuth();
  const [departments, setDepartments] = useState(propDepts);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", headId: "", memberIds: [] as string[], abilities: [] as string[] });
  const canManage = canManageDepartments(currentUser.role);

  const applyPresetAbilities = () => {
    setForm((f) => ({ ...f, abilities: getPresetAbilitiesForName(f.name) }));
  };

  const toggleAbility = (key: DepartmentAbility) => {
    setForm((f) => ({
      ...f,
      abilities: f.abilities.includes(key) ? f.abilities.filter((a) => a !== key) : [...f.abilities, key],
    }));
  };

  const load = useCallback(() => {
    api<Department[]>("/departments").then(setDepartments).catch(() => setDepartments(propDepts));
  }, [propDepts]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      headId: form.headId || null,
      memberIds: form.memberIds,
      abilities: form.abilities,
    };
    if (modal === "new") {
      await api("/departments", { method: "POST", body: JSON.stringify(payload) });
    } else if (editId) {
      await api(`/departments/${editId}`, { method: "PUT", body: JSON.stringify(payload) });
    }
    setModal(null);
    setEditId(null);
    load();
    onRefresh();
    await refreshAuth();
  };

  const openEdit = (d: Department) => {
    setEditId(d.id);
    setForm({
      name: d.name,
      headId: d.headId || "",
      memberIds: d.memberIds,
      abilities: d.abilities || [],
    });
    setModal("edit");
  };

  const confirmDeleteDepartment = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api(`/departments/${deleteTarget.id}`, { method: "DELETE" });
      setDeleteTarget(null);
      load();
      onRefresh();
      await refreshAuth();
      toast.success(`"${deleteTarget.name}" deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete department");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("departments")}
        title="Ministry Departments"
        subtitle="Department heads and serving members"
        action={
          canManage ? (
            <Btn
              onClick={() => {
                setEditId(null);
                setForm({ name: "", headId: "", memberIds: [], abilities: [] });
                setModal("new");
              }}
            >
              <Plus className="h-4 w-4" /> New Department
            </Btn>
          ) : undefined
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        {departments.map((d) => (
          <Card key={d.id}>
            <div className="flex justify-between gap-2">
              <h3 className="font-semibold">{d.name}</h3>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => openEdit(d)} aria-label={`Edit ${d.name}`}>
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                    onClick={() => setDeleteTarget(d)}
                    aria-label={`Delete ${d.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Head: <MemberNameLink members={members} id={d.headId} className="inline font-normal" />
            </p>
            <p className="mt-2 text-sm">{d.memberIds.length + (d.headId ? 1 : 0)} serving members</p>
            {d.abilities && d.abilities.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {d.abilities.map((a) => (
                  <Badge key={a} color="gray" className="text-[10px]">
                    {ABILITY_LABELS[a as DepartmentAbility] || a}
                  </Badge>
                ))}
              </div>
            )}
            <ul className="mt-3 space-y-1 text-sm">
              {d.memberIds.slice(0, 6).map((mid) => (
                <li key={mid}>
                  <MemberNameLink members={members} id={mid} className="font-normal" />
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "new" ? "New Department" : "Edit Department"}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          {canManage && (
            <Btn
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setForm((f) => ({ ...f, abilities: getPresetAbilitiesForName(f.name) }))}
            >
              Apply preset abilities from name
            </Btn>
          )}
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">Department abilities (all members)</legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {DEPARTMENT_ABILITIES.map((key) => (
                <label key={key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={form.abilities.includes(key)}
                    onChange={() => toggleAbility(key)}
                    disabled={!canManage}
                  />
                  <span>{ABILITY_LABELS[key]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <Select label="Head" value={form.headId} onChange={(v) => setForm((f) => ({ ...f, headId: v }))} options={[{ value: "", label: "Unassigned" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          <label className="block text-sm font-medium">Members</label>
          <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
            {members.filter((m) => m.active).map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.memberIds.includes(m.id)} onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    memberIds: e.target.checked ? [...f.memberIds, m.id] : f.memberIds.filter((id) => id !== m.id),
                  }));
                }} />
                {m.name}
              </label>
            ))}
          </div>
          <Btn onClick={save}>Save</Btn>
        </div>
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => !deleting && setDeleteTarget(null)} title="Delete department?">
        <p className="text-sm text-muted-foreground">
          {deleteTarget ? (
            <>
              Remove <span className="font-medium text-foreground">{deleteTarget.name}</span>? Member assignments and
              linked event/task references will be cleared. This cannot be undone.
            </>
          ) : null}
        </p>
        <ModalFooter>
          <Btn variant="secondary" disabled={deleting} onClick={() => setDeleteTarget(null)}>
            Cancel
          </Btn>
          <Btn variant="danger" disabled={deleting} onClick={confirmDeleteDepartment}>
            {deleting ? "Deleting…" : "Delete department"}
          </Btn>
        </ModalFooter>
      </Modal>
    </div>
  );
}

function attendanceEventLabel(record: AttendanceRecord, cells: Cell[]) {
  return record.type === "service"
    ? "Sunday Service"
    : cells.find((c) => c.id === record.cellId)?.name || "Cell meeting";
}

function AttendanceMemberLog({
  member,
  records,
  cells,
  expanded,
  onToggle,
}: {
  member: Member;
  records: AttendanceRecord[];
  cells: Cell[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const log = records
    .filter((r) => r.presentIds.includes(member.id) || r.absentIds.includes(member.id))
    .map((r) => ({
      id: r.id,
      date: r.date,
      label: attendanceEventLabel(r, cells),
      type: r.type,
      status: r.presentIds.includes(member.id) ? ("present" as const) : ("absent" as const),
      isNewcomer: r.newcomerIds?.includes(member.id),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  const presentCount = log.filter((e) => e.status === "present").length;
  const absentCount = log.filter((e) => e.status === "absent").length;
  const total = presentCount + absentCount;
  const rate = total ? Math.round((presentCount / total) * 100) : 0;

  return (
    <Card className="overflow-hidden p-0">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left transition hover:bg-muted/40"
      >
        <AvatarCircle name={member.name} size="md" />
        <div className="min-w-0 flex-1">
          <MemberNameLink members={[member]} id={member.id} />
          <p className="text-xs text-muted-foreground">{member.role}{member.phone ? ` · ${member.phone}` : ""}</p>
        </div>
        <div className="hidden shrink-0 text-right text-xs sm:block">
          <p className="font-medium text-emerald-600">{presentCount} present</p>
          <p className="text-muted-foreground">{absentCount} absent · {rate}%</p>
        </div>
        <Badge color="gray">{log.length} records</Badge>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3">
          <div className="mb-3 flex flex-wrap gap-2 text-xs sm:hidden">
            <Badge color="emerald">{presentCount} present</Badge>
            <Badge color="rose">{absentCount} absent</Badge>
            <Badge color="sky">{rate}% rate</Badge>
          </div>
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground">No attendance records for this member yet.</p>
          ) : (
            <ul className="max-h-64 space-y-2 overflow-y-auto">
              {log.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">{entry.date}</p>
                    <p className="truncate text-xs text-muted-foreground">{entry.label}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {entry.isNewcomer && <Badge color="violet">New</Badge>}
                    {entry.status === "present" ? (
                      <Badge color="emerald"><UserCheck className="mr-1 inline h-3 w-3" />Present</Badge>
                    ) : (
                      <Badge color="rose"><UserX className="mr-1 inline h-3 w-3" />Absent</Badge>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

export function AttendancePage({ members, cells, fellowships, currentUser, onRefresh }: PageProps) {
  const { departmentAbilities } = useAuth();
  const cellScoped = isCellScopedRole(currentUser.role);
  const myCell = cells.find((c) => c.id === currentUser.cellId);
  const [pageTab, setPageTab] = useState<"calendar" | "members" | "record">("calendar");
  const [mode, setMode] = useState<"cell" | "service">("cell");
  const [trends, setTrends] = useState<{ date: string; cell_name: string; present_count: number }[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cellId, setCellId] = useState(currentUser.cellId || cells[0]?.id || "");
  const [present, setPresent] = useState<Set<string>>(new Set());
  const [newcomers, setNewcomers] = useState<Set<string>>(new Set());
  const [guestNames, setGuestNames] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const load = () => api<typeof records>("/attendance").then(setRecords).catch(() => {});

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api<typeof trends>("/attendance/trends").then(setTrends).catch(() => {});
  }, []);
  useEffect(() => {
    if (cellScoped) setMode("cell");
  }, [cellScoped]);

  const trendChart = trends.reduce<Record<string, Record<string, number | string>>>((acc, row) => {
    const week = row.date?.slice(0, 7) || "week";
    if (!acc[week]) acc[week] = { week };
    const key = (row.cell_name || "cell").split(" ")[0];
    acc[week][key] = row.present_count;
    return acc;
  }, {});
  const trendData = Object.values(trendChart).slice(-6);

  const cellMembers = members.filter((m) => m.cellId === cellId && m.active);
  const serviceMembers = members.filter((m) => m.active);
  const scopedMembers = cellScoped ? members.filter((m) => m.cellId === currentUser.cellId) : members;

  const togglePresent = (id: string) => {
    const next = new Set(present);
    if (next.has(id)) {
      next.delete(id);
      const nc = new Set(newcomers);
      nc.delete(id);
      setNewcomers(nc);
    } else {
      next.add(id);
    }
    setPresent(next);
  };

  const toggleNewcomer = (id: string) => {
    if (!present.has(id)) return;
    const next = new Set(newcomers);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setNewcomers(next);
  };

  const save = async () => {
    const presentIds = [...present];
    const pool = mode === "cell" ? cellMembers : serviceMembers;
    const absentIds = pool.map((m) => m.id).filter((id) => !presentIds.includes(id));
    const guests = guestNames
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((name) => ({ name }));
    await api("/attendance", {
      method: "POST",
      body: JSON.stringify({
        date,
        type: mode,
        cellId: mode === "cell" ? cellId : undefined,
        presentIds,
        absentIds,
        newcomerIds: mode === "service" ? [...newcomers] : [],
        guests: mode === "service" ? guests : [],
      }),
    });
    setPresent(new Set());
    setNewcomers(new Set());
    setGuestNames("");
    load();
    onRefresh();
  };

  const roster = mode === "cell" ? cellMembers : serviceMembers;

  const filteredMembers = scopedMembers
    .filter((m) => m.active)
    .filter((m) => !memberSearch || m.name.toLowerCase().includes(memberSearch.toLowerCase()) || m.role.toLowerCase().includes(memberSearch.toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("attendance")}
        title="Attendance"
        subtitle={cellScoped ? `Cell attendance for ${myCell?.name || "your cell"}` : "View attendance by date, member, or record a new meeting"}
      />
      <TabBar
        tabs={[
          { id: "calendar" as const, label: "Calendar" },
          { id: "members" as const, label: "By Member" },
          { id: "record" as const, label: "Add New Attendance" },
        ]}
        value={pageTab}
        onChange={setPageTab}
      />

      {pageTab === "record" && (
        <>
      {(canRecordServiceAttendance(currentUser.role) ||
        canRecordServiceAttendanceForUser(currentUser.role, departmentAbilities)) && (
        <TabBar
          tabs={[
            { id: "cell" as const, label: "Cell Meeting" },
            { id: "service" as const, label: "Sunday Service" },
          ]}
          value={mode}
          onChange={setMode}
        />
      )}
      <Card>
        <h2 className="mb-4 font-semibold">{mode === "cell" ? "Record Cell Attendance" : "Record Service Attendance"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={setDate} />
          {mode === "cell" && !cellScoped && (
            <Select label="Cell" value={cellId} onChange={setCellId} options={cells.map((c) => ({ value: c.id, label: c.name }))} />
          )}
          {mode === "cell" && cellScoped && myCell && (
            <Input label="Cell" value={myCell.name} disabled onChange={() => {}} />
          )}
        </div>
        <div className="mt-4 space-y-2">
          {roster.map((m) => (
            <div key={m.id} className="flex items-center gap-2 rounded-lg border p-3 hover:bg-muted/50">
              <label className="flex flex-1 cursor-pointer items-center gap-3">
                <input type="checkbox" checked={present.has(m.id)} onChange={() => togglePresent(m.id)} />
                <span>{m.name}</span>
              </label>
              {mode === "service" && present.has(m.id) && (
                <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                  <input type="checkbox" checked={newcomers.has(m.id)} onChange={() => toggleNewcomer(m.id)} />
                  New
                </label>
              )}
            </div>
          ))}
        </div>
        {mode === "service" && (
          <div className="mt-4">
            <Textarea
              label="First-time guests (one name per line)"
              value={guestNames}
              onChange={setGuestNames}
              rows={3}
            />
          </div>
        )}
        <Btn className="mt-4" onClick={save}>Save Attendance</Btn>
      </Card>
      {trendData.length > 0 && (
        <Card>
          <h2 className="mb-4 font-semibold">Attendance Trends</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Grace" fill={CHART_COLORS[0]} />
              <Bar dataKey="Victory" fill={CHART_COLORS[1]} />
              <Bar dataKey="Faith" fill={CHART_COLORS[2]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}
        </>
      )}

      {pageTab === "calendar" && (
        <AttendanceCalendarView
          records={records}
          members={members}
          cells={cells}
          fellowships={fellowships}
          currentUser={currentUser}
          onRecordUpdated={load}
        />
      )}

      {pageTab === "members" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full min-h-[44px] rounded-lg border border-input py-2 pl-10 pr-3 text-base sm:text-sm"
            />
          </div>
          {filteredMembers.length === 0 ? (
            <Card><p className="text-sm text-muted-foreground">No members match your search.</p></Card>
          ) : (
            filteredMembers.map((m) => (
              <AttendanceMemberLog
                key={m.id}
                member={m}
                records={records}
                cells={cells}
                expanded={expandedMemberId === m.id}
                onToggle={() => setExpandedMemberId(expandedMemberId === m.id ? null : m.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Events ────────────────────────────────────────────────────────────────────

interface EventProgrammeItem {
  id: string;
  title: string;
  description: string;
  scheduledTime: string | null;
  sortOrder: number;
  status: string;
  assigneeIds: string[];
}

interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  rsvpIds: string[];
  programme: EventProgrammeItem[];
  programmeStatus: "none" | "draft" | "confirmed";
  programmeConfirmedAt: string | null;
  programmeConfirmedBy: string | null;
}

interface ProgrammeDraft {
  key: string;
  title: string;
  description: string;
  scheduledTime: string;
  assigneeIds: string[];
}

function newProgrammeDraft(): ProgrammeDraft {
  return { key: crypto.randomUUID(), title: "", description: "", scheduledTime: "", assigneeIds: [] };
}

export function EventsPage({ members, currentUser, onRefresh }: PageProps) {
  const { departmentAbilities } = useAuth();
  const canCreateEvents = canManageEventsForUser(currentUser.role, departmentAbilities);
  const canConfirmProgramme = canConfirmEventProgramme(currentUser.role);
  const [events, setEvents] = useState<ChurchEvent[]>([]);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [modal, setModal] = useState(false);
  const [createStep, setCreateStep] = useState<"details" | "programme">("details");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [programmeDraft, setProgrammeDraft] = useState<ProgrammeDraft[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const load = () => api<ChurchEvent[]>("/events").then(setEvents).catch(() => {});

  useEffect(() => { load(); }, []);

  const resetCreateFlow = () => {
    setCreateStep("details");
    setForm({ title: "", date: "", time: "", location: "", description: "" });
    setProgrammeDraft([]);
  };

  const openCreateModal = () => {
    resetCreateFlow();
    if (selectedDate) {
      setForm((f) => ({ ...f, date: selectedDate.toISOString().slice(0, 10) }));
    }
    setModal(true);
  };

  const goToProgrammeStep = () => {
    if (!form.title.trim() || !form.date) {
      alert("Title and date are required");
      return;
    }
    setCreateStep("programme");
  };

  const addProgrammeItem = () => {
    setProgrammeDraft((items) => [...items, newProgrammeDraft()]);
  };

  const create = async () => {
    const items = programmeDraft.filter((p) => p.title.trim());
    setSaving(true);
    try {
      const created = await api<{ id: string }>("/events", { method: "POST", body: JSON.stringify(form) });
      if (items.length > 0) {
        await api(`/events/${created.id}/programme`, {
          method: "PUT",
          body: JSON.stringify({
            items: items.map((p, i) => ({
              title: p.title.trim(),
              description: p.description.trim(),
              scheduledTime: p.scheduledTime.trim() || null,
              assigneeIds: p.assigneeIds,
              sortOrder: i,
            })),
          }),
        });
      }
      setModal(false);
      resetCreateFlow();
      load();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create event");
    } finally {
      setSaving(false);
    }
  };

  const rsvp = async (id: string) => {
    await api(`/events/${id}/rsvp`, { method: "POST" });
    load();
  };

  const confirmProgramme = async (eventId: string) => {
    setConfirmingId(eventId);
    try {
      await api(`/events/${eventId}/programme/confirm`, { method: "POST" });
      load();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to confirm programme");
    } finally {
      setConfirmingId(null);
    }
  };

  const programmeHasAssignees = (e: ChurchEvent) =>
    e.programme?.some((item) => item.assigneeIds.length > 0) ?? false;

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("events")}
        title="Events"
        subtitle={canCreateEvents ? "Church calendar and RSVPs" : "View church events and RSVP"}
        action={
          canCreateEvents ? (
            <Btn onClick={openCreateModal}>
              <Plus className="h-4 w-4" /> New Event
            </Btn>
          ) : undefined
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-semibold">Calendar</h2>
          <EventCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              if (d && canCreateEvents) setForm((f) => ({ ...f, date: d.toISOString().slice(0, 10) }));
            }}
          />
          <div className="mt-4 space-y-2">
            {events
              .filter((e) => !selectedDate || e.date === selectedDate.toISOString().slice(0, 10))
              .map((e) => (
                <div key={e.id} className="rounded-lg bg-primary/5 p-2 text-sm">
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.time}</p>
                </div>
              ))}
          </div>
        </Card>
        <div className="space-y-4 lg:col-span-2">
          {events
            .filter((e) => !selectedDate || e.date === selectedDate.toISOString().slice(0, 10))
            .map((e) => (
            <Card key={e.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.date} at {e.time} · {e.location}</p>
                  <p className="mt-2 text-sm">{e.description}</p>
                  {e.programme?.length > 0 && (
                    <div className="mt-4 rounded-xl border border-border/80 bg-muted/20 p-3">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Programme outline
                        </p>
                        {e.programmeStatus === "draft" && programmeHasAssignees(e) && (
                          <Badge color="amber">Awaiting pastor approval</Badge>
                        )}
                        {e.programmeStatus === "confirmed" && (
                          <Badge color="emerald">Confirmed by pastor</Badge>
                        )}
                      </div>
                      {e.programmeStatus === "draft" && programmeHasAssignees(e) && !canConfirmProgramme && (
                        <p className="mb-2 text-xs text-muted-foreground">
                          Assignees will be notified after a Pastor confirms this programme.
                        </p>
                      )}
                      <ol className="space-y-2">
                        {e.programme.map((item, idx) => (
                          <li key={item.id} className="flex gap-2 text-sm">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium">
                                {item.scheduledTime ? `${item.scheduledTime} · ` : ""}
                                {item.title}
                              </p>
                              {item.description && (
                                <p className="text-xs text-muted-foreground">{item.description}</p>
                              )}
                              {item.assigneeIds.length > 0 && (
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {item.assigneeIds.map((id) => memberName(members, id)).join(", ")}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {canConfirmProgramme &&
                    e.programmeStatus === "draft" &&
                    programmeHasAssignees(e) && (
                      <Btn
                        variant="highlight"
                        disabled={confirmingId === e.id}
                        onClick={() => confirmProgramme(e.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {confirmingId === e.id ? "Confirming…" : "Confirm & notify"}
                      </Btn>
                    )}
                  <Btn variant={e.rsvpIds.includes(currentUser.id) ? "secondary" : "accent"} onClick={() => rsvp(e.id)}>
                    {e.rsvpIds.includes(currentUser.id) ? "Cancel RSVP" : "RSVP"}
                  </Btn>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
      {canCreateEvents && (
      <Modal
        open={modal}
        onClose={() => {
          setModal(false);
          resetCreateFlow();
        }}
        title={createStep === "details" ? "Create Event — Details" : "Create Event — Programme outline"}
      >
        <p className="mb-4 text-xs text-muted-foreground">
          Step {createStep === "details" ? "1" : "2"} of 2
          {createStep === "programme" && form.title ? ` · ${form.title}` : ""}
        </p>
        {createStep === "details" ? (
          <div className="space-y-3">
            <Input label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
            <Input label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
            <Input label="Time" value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} placeholder="e.g. 10:00 AM" />
            <Input label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
            <Textarea label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
            <ModalFooter>
              <Btn variant="ghost" onClick={() => { setModal(false); resetCreateFlow(); }}>
                Cancel
              </Btn>
              <Btn onClick={goToProgrammeStep}>
                Next: Programme <ChevronRight className="h-4 w-4" />
              </Btn>
            </ModalFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add activities for the event programme. Assignees are notified only after a Pastor confirms the
              programme on the event page.
            </p>
            {programmeDraft.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                No programme items yet. Add activities or skip to create the event only.
              </p>
            ) : (
              <div className="max-h-[min(50vh,24rem)] space-y-3 overflow-y-auto pr-1">
                {programmeDraft.map((item, index) => (
                  <div key={item.key} className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground">Activity {index + 1}</span>
                      <button
                        type="button"
                        className="rounded p-1 text-destructive hover:bg-muted"
                        onClick={() => setProgrammeDraft((items) => items.filter((p) => p.key !== item.key))}
                        aria-label="Remove activity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      label="Activity"
                      value={item.title}
                      onChange={(v) =>
                        setProgrammeDraft((items) =>
                          items.map((p) => (p.key === item.key ? { ...p, title: v } : p))
                        )
                      }
                      placeholder="e.g. Opening prayer"
                    />
                    <Input
                      label="Time slot"
                      value={item.scheduledTime}
                      onChange={(v) =>
                        setProgrammeDraft((items) =>
                          items.map((p) => (p.key === item.key ? { ...p, scheduledTime: v } : p))
                        )
                      }
                      placeholder="e.g. 10:30 AM"
                    />
                    <Textarea
                      label="Notes"
                      value={item.description}
                      onChange={(v) =>
                        setProgrammeDraft((items) =>
                          items.map((p) => (p.key === item.key ? { ...p, description: v } : p))
                        )
                      }
                    />
                    <div>
                      <p className="mb-2 text-sm font-medium">Assignees (optional)</p>
                      <div className="max-h-24 space-y-1 overflow-y-auto rounded-lg border p-2">
                        {members
                          .filter((m) => m.active)
                          .map((m) => (
                            <label key={m.id} className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={item.assigneeIds.includes(m.id)}
                                onChange={(e) =>
                                  setProgrammeDraft((items) =>
                                    items.map((p) =>
                                      p.key === item.key
                                        ? {
                                            ...p,
                                            assigneeIds: e.target.checked
                                              ? [...p.assigneeIds, m.id]
                                              : p.assigneeIds.filter((id) => id !== m.id),
                                          }
                                        : p
                                    )
                                  )
                                }
                              />
                              {m.name}
                            </label>
                          ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Btn variant="secondary" onClick={addProgrammeItem}>
              <Plus className="h-4 w-4" /> Add activity
            </Btn>
            <ModalFooter>
              <Btn variant="ghost" onClick={() => setCreateStep("details")}>
                <ArrowLeft className="h-4 w-4" /> Back
              </Btn>
              <Btn onClick={create} disabled={saving}>
                {saving ? "Creating…" : "Create event"}
              </Btn>
            </ModalFooter>
          </div>
        )}
      </Modal>
      )}
    </div>
  );
}

// ─── Reports ───────────────────────────────────────────────────────────────────

export function ReportsPage({ departments }: PageProps) {
  const [growth, setGrowth] = useState<{ month: string; members: number }[]>([]);
  const [deptData, setDeptData] = useState<{ name: string; value: number }[]>([]);
  const [trends, setTrends] = useState<{ date: string; cell_name: string; present_count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api<{
      memberGrowth: { month: string; members: number }[];
      departmentParticipation: { name: string; value: number }[];
      attendanceTrends: { date: string; cell_name: string; present_count: number }[];
    }>("/reports/analytics")
      .then((analytics) => {
        setGrowth(analytics.memberGrowth.map((g) => ({ month: g.month?.slice(5) || g.month, members: Number(g.members) })));
        setDeptData(
          analytics.departmentParticipation
            .filter((d) => Number(d.value) > 0)
            .map((d) => ({ name: d.name, value: Number(d.value) }))
        );
        setTrends(analytics.attendanceTrends || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load reports"))
      .finally(() => setLoading(false));
  }, []);

  const trendByWeek = trends.reduce<Record<string, Record<string, number | string>>>((acc, row) => {
    const week = row.date.slice(0, 7);
    if (!acc[week]) acc[week] = { week };
    acc[week][row.cell_name?.split(" ")[0] || "cell"] = row.present_count;
    return acc;
  }, {});
  const barData = Object.values(trendByWeek).slice(-4);
  const deptTotal = deptData.reduce((sum, d) => sum + d.value, 0);

  const handleExport = () => {
    exportCSV("church-report.csv", ["Metric", "Value"], [
      ["Departments", String(departments.length)],
      ["Growth months", String(growth.length)],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("reports")} title="Reports & Analytics" subtitle="Growth, attendance, and participation" action={<Btn variant="accent" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Btn>} />
      {error && (
        <Card className="border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Could not load report data: {error}. Try refreshing the page.
        </Card>
      )}
      {loading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">Loading reports…</Card>
      ) : (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Member Growth</h2>
          {growth.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No member join dates recorded yet.</p>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke={CHART_COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Attendance by Cell</h2>
          {barData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No attendance recorded in the last 12 months. Record cell or service attendance to see trends here.</p>
          ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              {Object.keys(barData[0] || {}).filter((k) => k !== "week").map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} />
              ))}
            </BarChart>
          </ResponsiveContainer>
          )}
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Department Participation</h2>
          {deptData.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No department assignments yet. Add members to departments on the Departments page.</p>
          ) : (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center">
              <div className="mx-auto h-[220px] w-full max-w-[260px] shrink-0 lg:mx-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deptData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={88}
                      paddingAngle={2}
                      stroke="hsl(var(--card))"
                      strokeWidth={2}
                    >
                      {deptData.map((entry, i) => (
                        <ChartCell key={entry.name} name={entry.name} fill={pieSegmentColor(i)} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} member${value === 1 ? "" : "s"} (${deptTotal ? Math.round((Number(value) / deptTotal) * 100) : 0}%)`,
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="grid flex-1 gap-2 sm:grid-cols-2">
                {deptData.map((entry, i) => {
                  const pct = deptTotal ? Math.round((entry.value / deptTotal) * 100) : 0;
                  return (
                    <li
                      key={entry.name}
                      className="flex items-center gap-3 rounded-xl border border-border/80 bg-muted/25 px-3 py-2.5"
                    >
                      <span
                        className="h-3.5 w-3.5 shrink-0 rounded-md shadow-sm ring-1 ring-black/5"
                        style={{ backgroundColor: pieSegmentColor(i) }}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium leading-tight text-foreground">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {entry.value} member{entry.value === 1 ? "" : "s"} · {pct}%
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </Card>
      </div>
      )}
    </div>
  );
}

// ─── Settings ──────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  email: string;
  accessLevel: string;
  memberId: string;
  memberName: string;
  role: Role;
}

export function SettingsPage({ members, settings: propSettings, currentUser, onRefresh, userAccount }: PageProps & { userAccount?: { email: string } }) {
  const [settings, setSettings] = useState(propSettings);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userForm, setUserForm] = useState({ email: "", password: "", memberId: "", accessLevel: "standard" });
  const [saving, setSaving] = useState(false);
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [audit, setAudit] = useState<{ action: string; member_name: string; created_at: string }[]>([]);
  const [logoFile, setLogoFile] = useState<File | null>(null);

  useEffect(() => {
    api<ChurchSettings>("/settings").then(setSettings).catch(() => setSettings(propSettings));
    if (canManageSettings(currentUser.role)) {
      api<AdminUser[]>("/users").then(setUsers).catch(() => {});
      api<typeof audit>("/audit").then(setAudit).catch(() => {});
    }
  }, [propSettings, currentUser.role]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      await api("/settings", { method: "PUT", body: JSON.stringify(settings) });
      onRefresh();
    } finally {
      setSaving(false);
    }
  };

  const createUser = async () => {
    if (!userForm.email || !userForm.password || !userForm.memberId) return;
    await api("/users", { method: "POST", body: JSON.stringify(userForm) });
    setUserForm({ email: "", password: "", memberId: "", accessLevel: "standard" });
    api<AdminUser[]>("/users").then(setUsers);
  };

  const changePassword = async () => {
    if (pwForm.next !== pwForm.confirm) { setPwMsg("Passwords do not match"); return; }
    try {
      if (useSupabaseForAuth()) {
        await changeSupabasePassword(pwForm.current, pwForm.next, currentUser.email);
      } else {
        await api("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }) });
      }
      setPwMsg("Password updated.");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (e) {
      setPwMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    const fd = new FormData();
    fd.append("logo", logoFile);
    const res = await api<{ logoUrl: string }>("/settings/logo", { method: "POST", body: fd });
    setSettings((s) => ({ ...s, logoUrl: res.logoUrl }));
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("settings")} title="Settings" subtitle="Church profile and admin accounts" />
      <Card>
        <h2 className="mb-4 font-semibold">Change Password</h2>
        <p className="mb-3 text-sm text-muted-foreground">Account: {userAccount?.email}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Current" type="password" value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))} />
          <Input label="New" type="password" value={pwForm.next} onChange={(v) => setPwForm((p) => ({ ...p, next: v }))} />
          <Input label="Confirm" type="password" value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} />
        </div>
        {pwMsg && <p className="mt-2 text-sm text-accent">{pwMsg}</p>}
        <Btn className="mt-3" onClick={changePassword}>Update Password</Btn>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Church Information</h2>
        {settings.logoUrl && (
          <img
            src={settings.logoUrl}
            alt="Church logo"
            className="mb-4 h-16 object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Church Name" value={settings.name} onChange={(v) => setSettings((s) => ({ ...s, name: v }))} />
          <Input label="Tagline" value={settings.tagline} onChange={(v) => setSettings((s) => ({ ...s, tagline: v }))} />
          <Input
            label="Logo URL"
            value={settings.logoUrl || ""}
            onChange={(v) => setSettings((s) => ({ ...s, logoUrl: v }))}
            placeholder="https://… or upload a file below"
          />
          <Input label="Address" value={settings.address} onChange={(v) => setSettings((s) => ({ ...s, address: v }))} />
          <Input label="Phone" value={settings.phone} onChange={(v) => setSettings((s) => ({ ...s, phone: v }))} />
          <Input label="Email" value={settings.email} onChange={(v) => setSettings((s) => ({ ...s, email: v }))} />
        </div>
        {canManageSettings(currentUser.role) && (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Upload logo file</label>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
              </div>
              <Btn variant="accent" onClick={uploadLogo} disabled={!logoFile}>Upload Logo</Btn>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              On Render, uploads are stored in Supabase Storage. Paste a public image URL above, or upload again after deploy.
            </p>
            <Btn className="mt-4" onClick={saveSettings} disabled={saving}>{saving ? "Saving..." : "Save Settings"}</Btn>
          </>
        )}
      </Card>
      {canManageSettings(currentUser.role) && (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">Audit Log</h2>
            <ul className="max-h-48 space-y-1 overflow-y-auto text-sm">
              {audit.map((a, i) => (
                <li key={i} className="rounded bg-muted/50 px-2 py-1">{a.created_at} — {a.member_name || "System"}: {a.action}</li>
              ))}
            </ul>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Admin Accounts</h2>
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <Input label="Email" value={userForm.email} onChange={(v) => setUserForm((f) => ({ ...f, email: v }))} />
              <Input label="Password" type="password" value={userForm.password} onChange={(v) => setUserForm((f) => ({ ...f, password: v }))} />
              <Select label="Member" value={userForm.memberId} onChange={(v) => setUserForm((f) => ({ ...f, memberId: v }))} options={[{ value: "", label: "Select member" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
              <Select label="Access Level" value={userForm.accessLevel} onChange={(v) => setUserForm((f) => ({ ...f, accessLevel: v }))} options={[{ value: "standard", label: "Standard" }, { value: "full", label: "Full (extended modules)" }]} />
            </div>
            <Btn onClick={createUser}><Plus className="h-4 w-4" /> Create Account</Btn>
            <ul className="mt-4 space-y-2 text-sm">
              {users.map((u) => (
                <li key={u.id} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <span>{u.memberName} — {u.email}</span>
                  <Badge color="gray">{u.role}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
      <Card>
        <h2 className="mb-4 font-semibold">Role Definitions</h2>
        <ul className="space-y-2 text-sm">
          {ROLES.map((r) => (
            <li key={r} className="flex justify-between rounded-lg bg-muted/50 px-3 py-2">
              <span className="font-medium">{r}</span>
              <span className="text-muted-foreground">{PAGE_ACCESS[r].length} pages</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

// ─── Communications ────────────────────────────────────────────────────────────

export function CommunicationsPage({ members, currentUser }: PageProps) {
  return <ChatApp members={members} currentUser={currentUser} />;
}

// ─── Finances ──────────────────────────────────────────────────────────────────

interface FinanceRecord {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  memberId: string | null;
  description: string;
  purposeType?: string | null;
  purposeId?: string | null;
  purposeLabel?: string | null;
  purposeDisplay?: string | null;
}

type ExpensePurpose = "service" | "event" | "cell" | "outreach" | "general" | "other";

const INCOME_CATEGORIES = ["Tithe", "Offering", "Seed", "Project Fund"];
const EXPENSE_CATEGORIES = [
  "Refreshments",
  "Transport",
  "Sound & Media",
  "Venue & Setup",
  "Printing",
  "Decorations",
  "Honorarium",
  "Equipment",
  "Utilities",
  "Outreach",
  "Other",
];

const PURPOSE_LABELS: Record<ExpensePurpose, string> = {
  service: "Sunday Service",
  event: "Event",
  cell: "Cell Meeting",
  outreach: "Outreach",
  general: "General / Church",
  other: "Other",
};

export function FinancesPage({ members, currentUser }: PageProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [tithes, setTithes] = useState<{ memberId: string | null; memberName: string; total: number; records: FinanceRecord[] }[]>([]);
  const [contexts, setContexts] = useState<{
    services: { id: string; date: string; label: string }[];
    events: { id: string; title: string; date: string; label: string }[];
    cells: { id: string; name: string; label: string }[];
  }>({ services: [], events: [], cells: [] });
  const [tab, setTab] = useState<"ledger" | "expenses" | "transactions">("ledger");
  const [incomeForm, setIncomeForm] = useState({
    category: "Tithe",
    amount: "",
    description: "",
    memberId: "",
    date: new Date().toISOString().slice(0, 10),
  });
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: "Refreshments",
    amount: "",
    description: "",
    purposeType: "service" as ExpensePurpose,
    purposeId: "",
    purposeLabel: "",
  });

  const load = () => {
    api<FinanceRecord[]>("/finances").then(setRecords).catch(() => {});
    api<{ ledger: typeof tithes }>("/finances/tithes").then((d) => setTithes(d.ledger)).catch(() => {});
    api<typeof contexts>("/finances/expense-contexts").then(setContexts).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    if (contexts.services.length && !expenseForm.purposeId && expenseForm.purposeType === "service") {
      setExpenseForm((f) => ({ ...f, purposeId: contexts.services[0].id }));
    }
  }, [contexts.services, expenseForm.purposeId, expenseForm.purposeType]);

  if (!canAccessFinances(currentUser.role)) {
    return <Card><p className="text-muted-foreground">You do not have access to finances.</p></Card>;
  }

  const income = records.filter((f) => f.type === "income").reduce((s, f) => s + f.amount, 0);
  const expenses = records.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0);
  const expenseRecords = records.filter((f) => f.type === "expense");

  const resolvePurposeLabel = () => {
    const { purposeType, purposeId, purposeLabel } = expenseForm;
    if (purposeType === "service") {
      const svc = contexts.services.find((s) => s.id === purposeId);
      return svc?.label || purposeLabel;
    }
    if (purposeType === "event") {
      const ev = contexts.events.find((e) => e.id === purposeId);
      return ev?.label || purposeLabel;
    }
    if (purposeType === "cell") {
      const cell = contexts.cells.find((c) => c.id === purposeId);
      return cell?.label || purposeLabel;
    }
    return purposeLabel.trim() || PURPOSE_LABELS[purposeType];
  };

  const saveIncome = async () => {
    if (!incomeForm.amount) return;
    await api("/finances", {
      method: "POST",
      body: JSON.stringify({
        date: incomeForm.date,
        type: "income",
        category: incomeForm.category,
        amount: Number(incomeForm.amount),
        description: incomeForm.description,
        memberId: incomeForm.memberId || null,
      }),
    });
    setIncomeForm({ category: "Tithe", amount: "", description: "", memberId: "", date: new Date().toISOString().slice(0, 10) });
    load();
  };

  const saveExpense = async () => {
    if (!expenseForm.amount) return;
    const label = resolvePurposeLabel();
    await api("/finances", {
      method: "POST",
      body: JSON.stringify({
        date: expenseForm.date,
        type: "expense",
        category: expenseForm.category,
        amount: Number(expenseForm.amount),
        description: expenseForm.description,
        purposeType: expenseForm.purposeType,
        purposeId: ["service", "event", "cell"].includes(expenseForm.purposeType) ? expenseForm.purposeId || null : null,
        purposeLabel: label,
      }),
    });
    setExpenseForm({
      date: new Date().toISOString().slice(0, 10),
      category: "Refreshments",
      amount: "",
      description: "",
      purposeType: "service",
      purposeId: contexts.services[0]?.id || "",
      purposeLabel: "",
    });
    load();
  };

  const expensesByPurpose = expenseRecords.reduce<Record<string, FinanceRecord[]>>((acc, r) => {
    const key = r.purposeDisplay || r.purposeType || "General";
    if (!acc[key]) acc[key] = [];
    acc[key].push(r);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("finances")}
        title="Finances"
        subtitle="Income, expenses, and reporting"
        action={
          <Btn
            variant="accent"
            onClick={() =>
              exportCSV(
                "finances.csv",
                ["Date", "Type", "Category", "Amount", "Purpose", "Description"],
                records.map((f) => [f.date, f.type, f.category, String(f.amount), f.purposeDisplay || "", f.description || ""])
              )
            }
          >
            <Download className="h-4 w-4" /> Export
          </Btn>
        }
      />
      <TabBar
        tabs={[
          { id: "ledger" as const, label: "Tithe Ledger" },
          { id: "expenses" as const, label: "Expenses" },
          { id: "transactions" as const, label: "All Transactions" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard label="Total Income" value={formatCurrency(income)} icon={Wallet} tone="emerald" />
        <StatCard label="Total Expenses" value={formatCurrency(expenses)} icon={Wallet} tone="rose" />
        <StatCard label="Balance" value={formatCurrency(income - expenses)} icon={Wallet} tone="blue" />
      </div>

      {tab === "ledger" && (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">Record Income</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date" type="date" value={incomeForm.date} onChange={(v) => setIncomeForm((f) => ({ ...f, date: v }))} />
              <Select label="Category" value={incomeForm.category} onChange={(v) => setIncomeForm((f) => ({ ...f, category: v }))} options={INCOME_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              <Select label="Member (for tithe/offering)" value={incomeForm.memberId} onChange={(v) => setIncomeForm((f) => ({ ...f, memberId: v }))} options={[{ value: "", label: "General / Anonymous" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
              <Input label={`Amount (${CURRENCY_SYMBOL})`} value={incomeForm.amount} onChange={(v) => setIncomeForm((f) => ({ ...f, amount: v }))} />
              <Input label="Description" value={incomeForm.description} onChange={(v) => setIncomeForm((f) => ({ ...f, description: v }))} className="sm:col-span-2" />
            </div>
            <Btn className="mt-4" onClick={saveIncome}>Save Income</Btn>
          </Card>
          <Card>
            <h2 className="mb-4 font-semibold">Member Tithe & Offering Ledger</h2>
            {tithes.map((t) => (
              <div key={t.memberId || "anon"} className="mb-4 border-b pb-4 last:border-0">
                <div className="flex justify-between font-medium">
                  <span>{t.memberName}</span>
                  <span>{formatCurrency(t.total)}</span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {t.records.map((r) => (
                    <li key={r.id}>{r.date} — {r.category}: {formatCurrency(r.amount)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>
        </>
      )}

      {tab === "expenses" && (
        <>
          <Card>
            <h2 className="mb-4 font-semibold">Record Expense</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Input label="Date" type="date" value={expenseForm.date} onChange={(v) => setExpenseForm((f) => ({ ...f, date: v }))} />
              <Select
                label="Linked to"
                value={expenseForm.purposeType}
                onChange={(v) =>
                  setExpenseForm((f) => ({
                    ...f,
                    purposeType: v as ExpensePurpose,
                    purposeId: "",
                    purposeLabel: "",
                  }))
                }
                options={Object.entries(PURPOSE_LABELS).map(([value, label]) => ({ value, label }))}
              />
              {expenseForm.purposeType === "service" && (
                <Select
                  label="Service"
                  value={expenseForm.purposeId}
                  onChange={(v) => setExpenseForm((f) => ({ ...f, purposeId: v }))}
                  options={
                    contexts.services.length
                      ? contexts.services.map((s) => ({ value: s.id, label: s.label }))
                      : [{ value: "", label: "No service records — record attendance first" }]
                  }
                />
              )}
              {expenseForm.purposeType === "event" && (
                <Select
                  label="Event"
                  value={expenseForm.purposeId}
                  onChange={(v) => setExpenseForm((f) => ({ ...f, purposeId: v }))}
                  options={
                    contexts.events.length
                      ? contexts.events.map((e) => ({ value: e.id, label: e.label }))
                      : [{ value: "", label: "No events yet" }]
                  }
                />
              )}
              {expenseForm.purposeType === "cell" && (
                <Select
                  label="Cell"
                  value={expenseForm.purposeId}
                  onChange={(v) => setExpenseForm((f) => ({ ...f, purposeId: v }))}
                  options={contexts.cells.map((c) => ({ value: c.id, label: c.label }))}
                />
              )}
              {(expenseForm.purposeType === "outreach" || expenseForm.purposeType === "general" || expenseForm.purposeType === "other") && (
                <Input
                  label="Purpose label"
                  value={expenseForm.purposeLabel}
                  onChange={(v) => setExpenseForm((f) => ({ ...f, purposeLabel: v }))}
                  placeholder={expenseForm.purposeType === "outreach" ? "e.g. Street evangelism" : "e.g. Office supplies"}
                />
              )}
              <Select label="Category" value={expenseForm.category} onChange={(v) => setExpenseForm((f) => ({ ...f, category: v }))} options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))} />
              <Input label={`Amount (${CURRENCY_SYMBOL})`} value={expenseForm.amount} onChange={(v) => setExpenseForm((f) => ({ ...f, amount: v }))} />
              <Input label="Description" value={expenseForm.description} onChange={(v) => setExpenseForm((f) => ({ ...f, description: v }))} className="sm:col-span-2" />
            </div>
            <Btn className="mt-4" variant="highlight" onClick={saveExpense}>Save Expense</Btn>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Expense Records</h2>
            {expenseRecords.length === 0 ? (
              <p className="text-sm text-muted-foreground">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-6">
                {Object.entries(expensesByPurpose).map(([purpose, items]) => {
                  const subtotal = items.reduce((s, r) => s + r.amount, 0);
                  return (
                    <div key={purpose}>
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge color="coral">{purpose}</Badge>
                          <span className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}</span>
                        </div>
                        <span className="font-semibold text-highlight">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="space-y-2">
                        {items.map((f) => (
                          <div key={f.id} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5 text-sm">
                            <div className="min-w-0">
                              <p className="font-medium">{f.category}</p>
                              <p className="text-xs text-muted-foreground">{f.date}{f.description ? ` · ${f.description}` : ""}</p>
                            </div>
                            <p className="shrink-0 font-semibold">{formatCurrency(f.amount)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </>
      )}

      {tab === "transactions" && (
        <>
          <div className="space-y-3 md:hidden">
            {records.map((f) => (
              <Card key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{f.category}</p>
                    <p className="text-xs text-muted-foreground">{f.date}</p>
                    {f.purposeDisplay && <p className="mt-1 text-xs text-muted-foreground">{f.purposeDisplay}</p>}
                    {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(f.amount)}</p>
                    <Badge color={f.type === "income" ? "teal" : "coral"}>{f.type}</Badge>
                  </div>
                </div>
              </Card>
            ))}
            {records.length === 0 && <Card><p className="text-sm text-muted-foreground">No transactions yet</p></Card>}
          </div>
          <Card className="hidden overflow-x-auto p-0 md:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2">Type</th>
                  <th className="px-4 py-2">Category</th>
                  <th className="px-4 py-2">Purpose</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {records.map((f) => (
                  <tr key={f.id} className="border-t">
                    <td className="px-4 py-2">{f.date}</td>
                    <td className="px-4 py-2"><Badge color={f.type === "income" ? "teal" : "coral"}>{f.type}</Badge></td>
                    <td className="px-4 py-2">{f.category}</td>
                    <td className="px-4 py-2 text-muted-foreground">{f.purposeDisplay || "—"}</td>
                    <td className="px-4 py-2 text-right font-medium">{formatCurrency(f.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}

// ─── Prayer ────────────────────────────────────────────────────────────────────

interface PrayerRequest {
  id: string;
  memberId: string;
  title: string;
  content: string;
  isPrivate: boolean;
  status: "pending" | "prayed" | "answered";
  createdAt: string;
  response?: string;
}

export function PrayerPage({ members, currentUser }: PageProps) {
  const { departmentAbilities } = useAuth();
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [form, setForm] = useState({ title: "", content: "", isPrivate: false });

  const load = () => api<PrayerRequest[]>("/prayers").then(setPrayers).catch(() => {});

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title || !form.content) return;
    await api("/prayers", { method: "POST", body: JSON.stringify(form) });
    setForm({ title: "", content: "", isPrivate: false });
    load();
  };

  const updateStatus = async (id: string, status: PrayerRequest["status"], response?: string) => {
    await api(`/prayers/${id}`, { method: "PATCH", body: JSON.stringify({ status, response }) });
    load();
  };

  const canRespond = canManagePrayerForUser(currentUser.role, departmentAbilities);

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("prayer")} title="Prayer Requests" subtitle="Submit and track prayer needs" />
      <Card>
        <h2 className="mb-4 font-semibold">Submit Request</h2>
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm((p) => ({ ...p, title: v }))} />
          <Textarea label="Request" value={form.content} onChange={(v) => setForm((p) => ({ ...p, content: v }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.isPrivate} onChange={(e) => setForm((p) => ({ ...p, isPrivate: e.target.checked }))} />
            Private (visible to prayer team only)
          </label>
          <Btn onClick={submit}>Submit</Btn>
        </div>
      </Card>
      {prayers.map((p) => (
        <Card key={p.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">
                {p.title} {p.isPrivate ? <EyeOff className="inline h-4 w-4 text-muted-foreground" /> : <Eye className="inline h-4 w-4" />}
              </h3>
              <p className="text-sm text-muted-foreground">{memberName(members, p.memberId)} · {p.createdAt}</p>
              <p className="mt-2">{p.content}</p>
              {p.response && <p className="mt-2 text-sm text-accent">Response: {p.response}</p>}
            </div>
            {canRespond && (
              <div className="flex gap-2">
                <Btn variant="accent" onClick={() => updateStatus(p.id, "prayed", "Prayed for in intercession.")}>Mark Prayed</Btn>
                <Btn onClick={() => updateStatus(p.id, "answered")}>Answered</Btn>
              </div>
            )}
          </div>
          <Badge color={p.status === "pending" ? "coral" : p.status === "prayed" ? "teal" : "purple"} className="mt-2">{p.status}</Badge>
        </Card>
      ))}
    </div>
  );
}

// ─── Discipleship ──────────────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  name: string;
  contact: string;
  memberId?: string | null;
  stage: "Visitor" | "New Convert" | "Cell Member" | "Worker";
  assignedToId: string | null;
  notes: { date: string; text: string; outcome: string }[];
  createdAt: string;
}

export function DiscipleshipPage({ members, currentUser, onRefresh }: PageProps) {
  const { departmentAbilities } = useAuth();
  const canManageFu = canManageDiscipleshipForUser(currentUser.role, departmentAbilities);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [newFu, setNewFu] = useState({ memberId: "", stage: "Visitor" as FollowUp["stage"] });
  const [memberSearch, setMemberSearch] = useState("");
  const [savingFu, setSavingFu] = useState(false);
  const [note, setNote] = useState({ text: "", outcome: "" });

  const trackedMemberIds = new Set(followUps.map((fu) => fu.memberId).filter(Boolean));

  const selectableMembers = members
    .filter((m) => m.active && !trackedMemberIds.has(m.id))
    .filter(
      (m) =>
        !memberSearch ||
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(memberSearch.toLowerCase()) ||
        (m.phone && m.phone.includes(memberSearch))
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const selectedMember = members.find((m) => m.id === newFu.memberId);

  const load = () => api<FollowUp[]>("/follow-ups").then(setFollowUps).catch(() => {});

  useEffect(() => { load(); }, []);

  const addFollowUp = async () => {
    if (!newFu.memberId) {
      alert("Please select a member");
      return;
    }
    setSavingFu(true);
    try {
      await api("/follow-ups", {
        method: "POST",
        body: JSON.stringify({ memberId: newFu.memberId, stage: newFu.stage, assignedToId: currentUser.id }),
      });
      setAddModal(false);
      setNewFu({ memberId: "", stage: "Visitor" });
      setMemberSearch("");
      load();
      onRefresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to create follow-up");
    } finally {
      setSavingFu(false);
    }
  };

  const addNote = async () => {
    if (!noteModal || !note.text) return;
    await api(`/follow-ups/${noteModal}/notes`, {
      method: "POST",
      body: JSON.stringify({ text: note.text, outcome: note.outcome, date: new Date().toISOString().slice(0, 10) }),
    });
    setNoteModal(null);
    setNote({ text: "", outcome: "" });
    load();
  };

  const updateStage = async (id: string, stage: FollowUp["stage"]) => {
    await api(`/follow-ups/${id}`, { method: "PATCH", body: JSON.stringify({ stage }) });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("discipleship")}
        title="Discipleship & Follow-up"
        subtitle="Track visitors and new converts"
        action={
          canManageFu ? (
            <Btn
              onClick={() => {
                setMemberSearch("");
                setNewFu({ memberId: "", stage: "Visitor" });
                setAddModal(true);
              }}
            >
              <Plus className="h-4 w-4" /> Add
            </Btn>
          ) : undefined
        }
      />
      {followUps.map((fu) => (
        <Card key={fu.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">
                {fu.memberId ? <MemberNameLink members={members} id={fu.memberId} /> : fu.name}
              </h3>
              <p className="text-sm text-muted-foreground">{fu.contact || "—"}</p>
              <p className="text-xs text-muted-foreground">Assigned: {memberName(members, fu.assignedToId)}</p>
              <Badge color="purple" className="mt-2">{fu.stage}</Badge>
            </div>
            {canManageFu && (
              <div className="flex flex-col gap-2">
                <Select value={fu.stage} onChange={(v) => updateStage(fu.id, v as FollowUp["stage"])} options={["Visitor", "New Convert", "Cell Member", "Worker"].map((s) => ({ value: s, label: s }))} />
                <Btn variant="ghost" onClick={() => setNoteModal(fu.id)}>Add Note</Btn>
              </div>
            )}
          </div>
          {fu.notes.map((n, i) => (
            <p key={i} className="mt-2 border-l-2 border-accent pl-3 text-sm">{n.date}: {n.text} — <em>{n.outcome}</em></p>
          ))}
        </Card>
      ))}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Follow-up">
        <div className="space-y-3">
          <Input
            label="Search members"
            value={memberSearch}
            onChange={setMemberSearch}
            placeholder="Name, email, or phone"
          />
          <Select
            label="Member"
            value={newFu.memberId}
            onChange={(v) => setNewFu((f) => ({ ...f, memberId: v }))}
            options={[
              { value: "", label: selectableMembers.length ? "Select a member…" : "No members available" },
              ...selectableMembers.map((m) => ({
                value: m.id,
                label: `${m.name} · ${m.phone || m.email || "no contact"}`,
              })),
            ]}
          />
          {selectedMember && (
            <p className="rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              Contact on file: <span className="font-medium text-foreground">{selectedMember.phone || selectedMember.email || "—"}</span>
            </p>
          )}
          <Select
            label="Stage"
            value={newFu.stage}
            onChange={(v) => setNewFu((f) => ({ ...f, stage: v as FollowUp["stage"] }))}
            options={["Visitor", "New Convert", "Cell Member", "Worker"].map((s) => ({ value: s, label: s }))}
          />
          <ModalFooter>
            <Btn variant="ghost" onClick={() => setAddModal(false)}>
              Cancel
            </Btn>
            <Btn onClick={addFollowUp} disabled={savingFu || !newFu.memberId}>
              {savingFu ? "Creating…" : "Create"}
            </Btn>
          </ModalFooter>
        </div>
      </Modal>
      <Modal open={!!noteModal} onClose={() => setNoteModal(null)} title="Add Note">
        <div className="space-y-3">
          <Textarea label="Note" value={note.text} onChange={(v) => setNote((n) => ({ ...n, text: v }))} />
          <Input label="Outcome" value={note.outcome} onChange={(v) => setNote((n) => ({ ...n, outcome: v }))} />
          <Btn onClick={addNote}>Save Note</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Announcements ─────────────────────────────────────────────────────────────

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: "all" | "fellowship" | "cell" | "department" | "role";
  targetId?: string;
  targetRole?: string;
  pinned: boolean;
  expiresAt: string;
  createdAt: string;
}

export function AnnouncementsPage({ cells, fellowships, departments, currentUser, onRefresh }: PageProps) {
  const { departmentAbilities } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: "", content: "", target: "all" as Announcement["target"],
    targetId: "", targetRole: "", pinned: false, expiresAt: "",
  });

  const load = () => api<Announcement[]>("/announcements").then(setAnnouncements).catch(() => {});

  useEffect(() => { load(); }, []);

  const targetLabel = (a: Announcement) => {
    if (a.target === "all") return "All members";
    if (a.target === "fellowship") return fellowships.find((f) => f.id === a.targetId)?.name || "Fellowship";
    if (a.target === "cell") return cells.find((c) => c.id === a.targetId)?.name || "Cell";
    if (a.target === "department") return departments.find((d) => d.id === a.targetId)?.name || "Department";
    if (a.target === "role") return a.targetRole || "Role";
    return a.target;
  };

  const post = async () => {
    await api("/announcements", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        content: form.content,
        target: form.target,
        targetId: form.target === "role" ? undefined : form.targetId || undefined,
        targetRole: form.target === "role" ? form.targetRole : undefined,
        pinned: form.pinned,
        expiresAt: form.expiresAt || new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      }),
    });
    setModal(false);
    load();
    onRefresh();
  };

  const canPost = canPostAnnouncementsForUser(currentUser.role, departmentAbilities);

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("announcements")} title="Announcements" subtitle="Targeted church notices" action={canPost ? <Btn onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Post</Btn> : undefined} />
      {announcements.map((a) => (
        <Card key={a.id} className={a.pinned ? "border-highlight" : ""}>
          <div className="flex flex-wrap items-start gap-2">
            {a.pinned && <Pin className="h-4 w-4 text-highlight" />}
            <div className="flex-1">
              <h3 className="font-semibold">{a.title}</h3>
              <Badge color="teal" className="mt-1">{targetLabel(a)}</Badge>
              <p className="mt-2 text-sm">{a.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">Expires: {a.expiresAt}</p>
            </div>
          </div>
        </Card>
      ))}
      <Modal open={modal} onClose={() => setModal(false)} title="Post Announcement">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Textarea label="Content" value={form.content} onChange={(v) => setForm((f) => ({ ...f, content: v }))} />
          <Select label="Target" value={form.target} onChange={(v) => setForm((f) => ({ ...f, target: v as Announcement["target"] }))} options={[
            { value: "all", label: "All members" },
            { value: "fellowship", label: "Fellowship" },
            { value: "cell", label: "Cell" },
            { value: "department", label: "Department" },
            { value: "role", label: "Role" },
          ]} />
          {form.target === "fellowship" && <Select label="Fellowship" value={form.targetId} onChange={(v) => setForm((f) => ({ ...f, targetId: v }))} options={fellowships.map((f) => ({ value: f.id, label: f.name }))} />}
          {form.target === "cell" && <Select label="Cell" value={form.targetId} onChange={(v) => setForm((f) => ({ ...f, targetId: v }))} options={cells.map((c) => ({ value: c.id, label: c.name }))} />}
          {form.target === "department" && <Select label="Department" value={form.targetId} onChange={(v) => setForm((f) => ({ ...f, targetId: v }))} options={departments.map((d) => ({ value: d.id, label: d.name }))} />}
          {form.target === "role" && <Select label="Role" value={form.targetRole} onChange={(v) => setForm((f) => ({ ...f, targetRole: v }))} options={ROLES.map((r) => ({ value: r, label: r }))} />}
          <Input label="Expires" type="date" value={form.expiresAt} onChange={(v) => setForm((f) => ({ ...f, expiresAt: v }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((f) => ({ ...f, pinned: e.target.checked }))} />
            Pin announcement
          </label>
          <Btn onClick={post}>Post</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Tasks ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  description: string;
  assigneeIds: string[];
  departmentId: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
  eventDate?: string | null;
  scheduledTime?: string | null;
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
}

export function TasksPage({ members, departments, currentUser }: PageProps) {
  const { departmentAbilities } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    title: "", description: "", dueDate: "", priority: "medium" as Task["priority"],
    departmentId: "", assigneeIds: [] as string[],
  });

  const load = () => api<Task[]>("/tasks").then(setTasks).catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api("/tasks", {
      method: "POST",
      body: JSON.stringify({
        title: form.title,
        description: form.description,
        dueDate: form.dueDate,
        priority: form.priority,
        departmentId: form.departmentId || null,
        assigneeIds: form.assigneeIds,
      }),
    });
    setModal(false);
    load();
  };

  const toggleStatus = async (t: Task) => {
    const next = t.status === "completed" ? "pending" : "completed";
    await api(`/tasks/${t.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    load();
  };

  const canCreate = canManageTasksForUser(currentUser.role, departmentAbilities);

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("tasks")} title="Tasks & Assignments" subtitle="Ministry tasks with notifications" action={canCreate ? <Btn onClick={() => setModal(true)}><Plus className="h-4 w-4" /> New Task</Btn> : undefined} />
      {tasks.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">
                Due: {t.dueDate}
                {t.eventTitle && (
                  <>
                    {" "}
                    · Event: <span className="font-medium text-foreground">{t.eventTitle}</span>
                    {t.scheduledTime ? ` (${t.scheduledTime})` : ""}
                  </>
                )}
              </p>
              <p className="mt-1 text-sm">{t.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assignees: {t.assigneeIds.map((id) => memberName(members, id)).join(", ") || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={t.priority === "high" ? "coral" : t.priority === "medium" ? "teal" : "gray"}>{t.priority}</Badge>
              <button type="button" onClick={() => toggleStatus(t)}>
                {t.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-accent" /> : <Circle className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </Card>
      ))}
      <Modal open={modal} onClose={() => setModal(false)} title="New Task">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Textarea label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <Input label="Due Date" type="date" value={form.dueDate} onChange={(v) => setForm((f) => ({ ...f, dueDate: v }))} />
          <Select label="Priority" value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v as Task["priority"] }))} options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }]} />
          <Select label="Department" value={form.departmentId} onChange={(v) => setForm((f) => ({ ...f, departmentId: v }))} options={[{ value: "", label: "None" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
          <label className="block text-sm font-medium">Assignees</label>
          <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border p-2">
            {members.filter((m) => m.active).map((m) => (
              <label key={m.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.assigneeIds.includes(m.id)} onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    assigneeIds: e.target.checked ? [...f.assigneeIds, m.id] : f.assigneeIds.filter((id) => id !== m.id),
                  }));
                }} />
                {m.name}
              </label>
            ))}
          </div>
          <Btn onClick={create}>Create & Notify</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Media ─────────────────────────────────────────────────────────────────────

interface MediaItem {
  id: string;
  title: string;
  type: "audio" | "video" | "notes" | "slides";
  speaker: string;
  series: string;
  topic: string;
  date: string;
  fileUrl: string | null;
  status?: "pending" | "approved" | "rejected";
}

export function MediaPage({ currentUser }: PageProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [capabilities, setCapabilities] = useState({ canUpload: false, canApprove: false, canViewPending: false });
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [form, setForm] = useState({ title: "", type: "video", speaker: "", series: "", topic: "", date: "", shareTarget: "all", shareTargetId: "" });
  const [file, setFile] = useState<File | null>(null);
  const [playing, setPlaying] = useState<MediaItem | null>(null);

  const load = useCallback(() => {
    const params = search ? `?search=${encodeURIComponent(search)}` : "";
    api<MediaItem[]>(`/media${params}`).then(setMedia).catch(() => {});
  }, [search]);

  useEffect(() => {
    api<{ canUpload: boolean; canApprove: boolean; canViewPending: boolean }>("/media/capabilities")
      .then(setCapabilities)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const upload = async () => {
    if (!form.title) return;
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("type", form.type);
    fd.append("speaker", form.speaker);
    fd.append("series", form.series);
    fd.append("topic", form.topic);
    fd.append("date", form.date || new Date().toISOString().slice(0, 10));
    fd.append("shareTarget", form.shareTarget);
    if (form.shareTargetId) fd.append("shareTargetId", form.shareTargetId);
    if (file) fd.append("file", file);
    await api("/media", { method: "POST", body: fd });
    setUploadOpen(false);
    setForm({ title: "", type: "video", speaker: "", series: "", topic: "", date: "", shareTarget: "all", shareTargetId: "" });
    setFile(null);
    load();
  };

  const setMediaStatus = async (id: string, status: "approved" | "rejected") => {
    await api(`/media/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    load();
  };

  const isPastoral = canApproveMedia(currentUser.role);

  return (
    <div className="space-y-6">
      <PageHeader
        {...pageHeaderProps("media")}
        title="Media Library"
        subtitle={
          isPastoral || capabilities.canUpload
            ? "Sermons, notes, and teaching resources"
            : "Approved sermons and teaching resources"
        }
        action={
          capabilities.canUpload ? (
            <Btn onClick={() => setUploadOpen(true)}>
              <Upload className="h-4 w-4" /> Upload
            </Btn>
          ) : undefined
        }
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sermons..." className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {media.map((m) => {
          const mediaTone = m.type === "video" ? "rose" as IconTone : m.type === "audio" ? "violet" as IconTone : "indigo" as IconTone;
          return (
          <Card key={m.id}>
            <div className="flex gap-4">
              <IconBox icon={m.type === "video" || m.type === "audio" ? Play : FileText} tone={mediaTone} size="lg" className="h-14 w-14 rounded-xl" />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{m.title}</h3>
                  {m.status === "pending" && <Badge color="orange">Pending approval</Badge>}
                  {m.status === "rejected" && <Badge color="rose">Rejected</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">{m.speaker} · {m.series}</p>
                <p className="text-xs text-muted-foreground">{m.date} · {m.topic}</p>
                {m.fileUrl && m.status !== "rejected" && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(m.type === "video" || m.type === "audio") && (
                      <Btn variant="accent" className="!px-2 !py-1 text-xs" onClick={() => setPlaying(m)}>
                        <Play className="h-3 w-3" /> Play
                      </Btn>
                    )}
                    <a href={m.fileUrl} download className="inline-flex items-center gap-1 text-sm text-accent">
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                )}
                {capabilities.canApprove && m.status === "pending" && (
                  <div className="mt-2 flex gap-2">
                    <Btn variant="accent" className="!px-2 !py-1 text-xs" onClick={() => setMediaStatus(m.id, "approved")}>Approve</Btn>
                    <Btn variant="ghost" className="!px-2 !py-1 text-xs" onClick={() => setMediaStatus(m.id, "rejected")}>Reject</Btn>
                  </div>
                )}
              </div>
            </div>
          </Card>
        );
        })}
      </div>
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Media">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Select label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v }))} options={["video", "audio", "notes", "slides"].map((t) => ({ value: t, label: t }))} />
          <Input label="Speaker" value={form.speaker} onChange={(v) => setForm((f) => ({ ...f, speaker: v }))} />
          <Input label="Series" value={form.series} onChange={(v) => setForm((f) => ({ ...f, series: v }))} />
          <Input label="Topic" value={form.topic} onChange={(v) => setForm((f) => ({ ...f, topic: v }))} />
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
          <label className="block text-sm font-medium">File</label>
          <Select label="Share with" value={form.shareTarget} onChange={(v) => setForm((f) => ({ ...f, shareTarget: v }))} options={[{ value: "all", label: "All members" }, { value: "cell", label: "Cell" }, { value: "fellowship", label: "Fellowship" }, { value: "department", label: "Department" }]} />
          <input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-sm" />
          <Btn onClick={upload}>Upload</Btn>
        </div>
      </Modal>
      <Modal open={!!playing} onClose={() => setPlaying(null)} title={playing?.title || "Media"}>
        {playing?.fileUrl && playing.type === "video" && (
          <video src={playing.fileUrl} controls className="w-full rounded-lg" />
        )}
        {playing?.fileUrl && playing.type === "audio" && (
          <audio src={playing.fileUrl} controls className="w-full" />
        )}
        {playing?.fileUrl && (playing.type === "notes" || playing.type === "slides") && (
          <p className="text-sm text-muted-foreground">Open or download this file to view.</p>
        )}
      </Modal>
    </div>
  );
}

// ─── Report Submissions ──────────────────────────────────────────────────────────

interface CellReport {
  id: string;
  type: "cell" | "fellowship" | "department";
  submitterId: string;
  cellId?: string;
  fellowshipId?: string;
  departmentId?: string;
  period: string;
  attendanceCount: number;
  newVisitors: number;
  description: string;
  status: "draft" | "submitted" | "approved" | "overdue";
  pastorComment?: string;
  submittedAt: string;
}

export function ReportSubmissionsPage({ members, cells, departments, currentUser, onRefresh }: PageProps) {
  const { departmentAbilities } = useAuth();
  const [reports, setReports] = useState<CellReport[]>([]);
  const [form, setForm] = useState({ attendanceCount: "", newVisitors: "", description: "", dueDate: "" });
  const [approveComment, setApproveComment] = useState<Record<string, string>>({});
  const canDeptReport = canSubmitDepartmentReport(departmentAbilities);
  const myDepartmentIds = departments
    .filter((d) => d.memberIds.includes(currentUser.id) || d.headId === currentUser.id)
    .map((d) => d.id);

  const load = () => api<CellReport[]>("/reports/submissions").then(setReports).catch(() => {});

  useEffect(() => { load(); }, []);

  const reportType =
    canDeptReport && !["Cell Leader", "Sub-cell Leader", "Fellowship Leader"].includes(currentUser.role)
      ? "department"
      : currentUser.role === "Fellowship Leader"
        ? "fellowship"
        : "cell";

  const submit = async () => {
    await api("/reports/submissions", {
      method: "POST",
      body: JSON.stringify({
        type: reportType,
        cellId: reportType === "cell" ? currentUser.cellId : null,
        fellowshipId: reportType === "fellowship" ? currentUser.fellowshipId : null,
        departmentId: reportType === "department" ? myDepartmentIds[0] || null : null,
        period: `Week of ${new Date().toISOString().slice(0, 10)}`,
        attendanceCount: Number(form.attendanceCount) || 0,
        newVisitors: Number(form.newVisitors) || 0,
        description: form.description,
        dueDate: form.dueDate || undefined,
      }),
    });
    setForm({ attendanceCount: "", newVisitors: "", description: "", dueDate: "" });
    load();
    onRefresh();
  };

  const approve = async (id: string) => {
    await api(`/reports/submissions/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "approved", pastorComment: approveComment[id] || "Approved. Well done." }),
    });
    load();
  };

  const canSubmit =
    currentUser.role === "Cell Leader" ||
    currentUser.role === "Sub-cell Leader" ||
    currentUser.role === "Fellowship Leader" ||
    canDeptReport;

  return (
    <div className="space-y-6">
      <PageHeader {...pageHeaderProps("report-submissions")} title="Report Submissions" subtitle="Cell, fellowship, and department reports" />
      {canSubmit && (
        <Card>
          <h2 className="mb-4 font-semibold">Submit {reportType} report</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Attendance Count" value={form.attendanceCount} onChange={(v) => setForm((r) => ({ ...r, attendanceCount: v }))} />
            <Input label="New Visitors" value={form.newVisitors} onChange={(v) => setForm((r) => ({ ...r, newVisitors: v }))} />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(v) => setForm((r) => ({ ...r, dueDate: v }))} />
            <div className="sm:col-span-2">
              <Textarea
                label="Description"
                value={form.description}
                onChange={(v) => setForm((r) => ({ ...r, description: v }))}
                rows={4}
              />
            </div>
          </div>
          <Btn className="mt-4" onClick={submit}>Submit Report</Btn>
        </Card>
      )}
      {reports.map((r) => (
        <Card key={r.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold capitalize">{r.type} Report — {r.period}</h3>
              <p className="text-sm text-muted-foreground">By {memberName(members, r.submitterId)}</p>
              {r.cellId && <p className="text-xs text-muted-foreground">Cell: {cells.find((c) => c.id === r.cellId)?.name}</p>}
              <p className="mt-2 text-sm">Attendance: {r.attendanceCount} · Visitors: {r.newVisitors}</p>
              {r.description && <p className="mt-2 whitespace-pre-wrap text-sm">{r.description}</p>}
              {r.pastorComment && <p className="mt-2 text-sm text-accent">Pastor: {r.pastorComment}</p>}
            </div>
            <Badge color={r.status === "approved" ? "teal" : r.status === "overdue" ? "coral" : "purple"}>{r.status}</Badge>
          </div>
          {isPastoral(currentUser.role) && r.status === "submitted" && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Input value={approveComment[r.id] || ""} onChange={(v) => setApproveComment((c) => ({ ...c, [r.id]: v }))} placeholder="Pastor comment (optional)" className="flex-1" />
              <Btn variant="accent" onClick={() => approve(r.id)}>Approve</Btn>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
