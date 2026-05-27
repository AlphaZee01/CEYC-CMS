import { useMemo, useState, type ReactNode } from "react";
import {
  Church,
  Network,
  UserCheck,
  UserX,
  Users,
  CalendarDays,
  TrendingUp,
  Search,
  CheckCheck,
  RotateCcw,
} from "lucide-react";
import { Card, Badge, Btn, Input, Select, Textarea, AvatarCircle, IconBox, cn } from "@/components/church/ui";
import type { AttendanceRecord } from "@/components/church/AttendanceCalendar";
import type { Member, Cell } from "@/types/church";
import type { IconTone } from "@/lib/icon-colors";

export function attendanceEventLabel(record: AttendanceRecord, cells: Cell[]) {
  return record.type === "service"
    ? "Sunday Service"
    : cells.find((c) => c.id === record.cellId)?.name || "Cell meeting";
}

export function computeAttendanceStats(records: AttendanceRecord[]) {
  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = records.filter((r) => r.date.startsWith(monthPrefix));
  const services = records.filter((r) => r.type === "service");
  const cells = records.filter((r) => r.type === "cell");
  const lastService = services[0] ?? null;
  const lastCell = cells[0] ?? null;

  const rateFor = (r: AttendanceRecord) => {
    const total = r.presentIds.length + r.absentIds.length;
    return total ? Math.round((r.presentIds.length / total) * 100) : 0;
  };

  return {
    totalRecords: records.length,
    thisMonthCount: thisMonth.length,
    lastService: lastService
      ? { date: lastService.date, present: lastService.presentIds.length, rate: rateFor(lastService) }
      : null,
    lastCell: lastCell
      ? { date: lastCell.date, present: lastCell.presentIds.length, rate: rateFor(lastCell) }
      : null,
  };
}

function StatMini({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: typeof Users;
  tone: IconTone;
}) {
  return (
    <Card className="min-w-0 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <IconBox icon={Icon} tone={tone} size="md" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold tracking-tight text-foreground">{value}</p>
          {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export function AttendanceStatsBar({ records }: { records: AttendanceRecord[] }) {
  const stats = useMemo(() => computeAttendanceStats(records), [records]);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 [&>*]:min-w-0">
      <StatMini
        label="Records this month"
        value={stats.thisMonthCount}
        sub={`${stats.totalRecords} all time`}
        icon={CalendarDays}
        tone="blue"
      />
      <StatMini
        label="Last service"
        value={stats.lastService?.present ?? "—"}
        sub={
          stats.lastService
            ? `${stats.lastService.date} · ${stats.lastService.rate}% present`
            : "No service yet"
        }
        icon={Church}
        tone="indigo"
      />
      <StatMini
        label="Last cell meeting"
        value={stats.lastCell?.present ?? "—"}
        sub={
          stats.lastCell
            ? `${stats.lastCell.date} · ${stats.lastCell.rate}% present`
            : "No cell record yet"
        }
        icon={Network}
        tone="cyan"
      />
      <StatMini
        label="Latest turnout"
        value={
          stats.lastService
            ? `${stats.lastService.rate}%`
            : stats.lastCell
              ? `${stats.lastCell.rate}%`
              : "—"
        }
        sub="Most recent meeting rate"
        icon={TrendingUp}
        tone="emerald"
      />
    </div>
  );
}

function AttendanceProgress({ present, total }: { present: number; total: number }) {
  const pct = total ? Math.round((present / total) * 100) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-foreground">
          {present} of {total} marked present
        </span>
        <span className="text-muted-foreground">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function AttendanceRecordPanel({
  mode,
  date,
  onDateChange,
  cellId,
  onCellIdChange,
  cells,
  myCellName,
  cellScoped,
  roster,
  present,
  onTogglePresent,
  newcomers,
  onToggleNewcomer,
  guestNames,
  onGuestNamesChange,
  onSave,
  saving,
  canSwitchMode,
  onModeChange,
}: {
  mode: "cell" | "service";
  date: string;
  onDateChange: (v: string) => void;
  cellId: string;
  onCellIdChange: (v: string) => void;
  cells: Cell[];
  myCellName?: string;
  cellScoped: boolean;
  roster: Member[];
  present: Set<string>;
  onTogglePresent: (id: string) => void;
  newcomers: Set<string>;
  onToggleNewcomer: (id: string) => void;
  guestNames: string;
  onGuestNamesChange: (v: string) => void;
  onSave: () => void;
  saving?: boolean;
  canSwitchMode?: boolean;
  onModeChange?: (mode: "cell" | "service") => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      roster.filter(
        (m) =>
          !search ||
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.role.toLowerCase().includes(search.toLowerCase())
      ),
    [roster, search]
  );

  const presentCount = roster.filter((m) => present.has(m.id)).length;
  const guestCount = guestNames.split("\n").map((l) => l.trim()).filter(Boolean).length;

  const markAll = () => {
    roster.forEach((m) => {
      if (!present.has(m.id)) onTogglePresent(m.id);
    });
  };

  const clearAll = () => {
    [...present].forEach((id) => onTogglePresent(id));
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">
              {mode === "cell" ? "Record cell meeting" : "Record Sunday service"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Tap members to mark present. Absent members are saved automatically.
            </p>
          </div>
          {canSwitchMode && onModeChange && (
            <div className="flex rounded-xl border border-border bg-background p-1">
              <button
                type="button"
                onClick={() => onModeChange("cell")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  mode === "cell" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Cell
              </button>
              <button
                type="button"
                onClick={() => onModeChange("service")}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  mode === "service" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground"
                )}
              >
                Service
              </button>
            </div>
          )}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input label="Meeting date" type="date" value={date} onChange={onDateChange} />
          {mode === "cell" && !cellScoped && (
            <Select
              label="Cell"
              value={cellId}
              onChange={onCellIdChange}
              options={cells.map((c) => ({ value: c.id, label: c.name }))}
            />
          )}
          {mode === "cell" && cellScoped && myCellName && (
            <Input label="Cell" value={myCellName} disabled onChange={() => {}} />
          )}
        </div>
        <div className="mt-4">
          <AttendanceProgress present={presentCount} total={roster.length} />
        </div>
      </div>

      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roster…"
              className="w-full min-h-[44px] rounded-xl border border-input bg-background py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Btn variant="secondary" className="!min-h-10 flex-1 sm:flex-none" onClick={markAll}>
              <CheckCheck className="h-4 w-4" /> All present
            </Btn>
            <Btn variant="ghost" className="!min-h-10 flex-1 sm:flex-none" onClick={clearAll}>
              <RotateCcw className="h-4 w-4" /> Clear
            </Btn>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge color="emerald">
            <UserCheck className="mr-1 inline h-3 w-3" />
            {presentCount} present
          </Badge>
          <Badge color="rose">
            <UserX className="mr-1 inline h-3 w-3" />
            {roster.length - presentCount} absent
          </Badge>
          {mode === "service" && guestCount > 0 && (
            <Badge color="violet">{guestCount} guest{guestCount === 1 ? "" : "s"}</Badge>
          )}
        </div>
      </div>

      <ul className="max-h-[min(52vh,28rem)] divide-y divide-border overflow-y-auto">
        {filtered.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">No members match your search.</li>
        ) : (
          filtered.map((m) => {
            const isPresent = present.has(m.id);
            const isNew = newcomers.has(m.id);
            return (
              <li key={m.id}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition sm:px-5",
                    isPresent ? "bg-emerald-500/5" : "hover:bg-muted/40"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onTogglePresent(m.id)}
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition",
                      isPresent
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-muted-foreground/30 bg-background text-transparent hover:border-emerald-500/50"
                    )}
                    aria-label={isPresent ? `Mark ${m.name} absent` : `Mark ${m.name} present`}
                  >
                    <UserCheck className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onTogglePresent(m.id)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <AvatarCircle name={m.name} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </button>
                  {mode === "service" && isPresent && (
                    <button
                      type="button"
                      onClick={() => onToggleNewcomer(m.id)}
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold transition",
                        isNew
                          ? "bg-violet-500 text-white"
                          : "border border-violet-500/30 text-violet-700 hover:bg-violet-500/10 dark:text-violet-300"
                      )}
                    >
                      New
                    </button>
                  )}
                </div>
              </li>
            );
          })
        )}
      </ul>

      {mode === "service" && (
        <div className="border-t border-border px-4 py-4 sm:px-5">
          <Textarea
            label="First-time guests (one name per line)"
            value={guestNames}
            onChange={onGuestNamesChange}
            rows={3}
            placeholder="e.g. John Smith"
          />
        </div>
      )}

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 py-4 backdrop-blur-sm sm:px-5">
        <Btn className="w-full" onClick={onSave} disabled={saving || roster.length === 0}>
          {saving ? "Saving…" : `Save ${mode === "cell" ? "cell" : "service"} attendance`}
        </Btn>
      </div>
    </Card>
  );
}

export function AttendanceRateBar({ present, absent }: { present: number; absent: number }) {
  const total = present + absent;
  const pct = total ? Math.round((present / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{pct}%</span>
    </div>
  );
}

export function AttendanceFilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-semibold transition",
            value === o.id
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-muted text-muted-foreground hover:text-foreground"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AttendanceSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold tracking-tight">{title}</h2>
      {action}
    </div>
  );
}
