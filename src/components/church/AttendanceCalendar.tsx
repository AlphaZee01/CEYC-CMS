import { useMemo, useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import type { DayContentProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Card, Badge, IconBox, AvatarCircle, Btn, cn } from "@/components/church/ui";
import { Church, Network, Building2, UserCheck, UserX, ChevronLeft, Edit } from "lucide-react";
import { api } from "@/lib/api";
import { canEditCellAttendance } from "@/lib/rbac";
import type { Member, Cell, Fellowship } from "@/types/church";

export type AttendanceRecord = {
  id: string;
  date: string;
  type: string;
  cellId: string | null;
  fellowshipId?: string | null;
  presentIds: string[];
  absentIds: string[];
  newcomerIds?: string[];
  guests?: { name: string; contact?: string | null }[];
};

function eventLabel(record: AttendanceRecord, cells: Cell[]) {
  return record.type === "service"
    ? "Sunday Service"
    : cells.find((c) => c.id === record.cellId)?.name || "Cell meeting";
}

function memberStatus(record: AttendanceRecord, memberId: string): "present" | "absent" | null {
  if (record.presentIds.includes(memberId)) return "present";
  if (record.absentIds.includes(memberId)) return "absent";
  return null;
}

function groupMembersByFellowshipAndCell(
  record: AttendanceRecord,
  members: Member[],
  cells: Cell[],
  fellowships: Fellowship[]
) {
  const ids = new Set([...record.presentIds, ...record.absentIds]);
  const involved = [...ids]
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => !!m);

  const felName = (id: string | null | undefined) =>
    fellowships.find((f) => f.id === id)?.name || "Unassigned fellowship";
  const cellName = (id: string | null | undefined) =>
    cells.find((c) => c.id === id)?.name || "No cell";

  const felMap = new Map<string, Map<string, Member[]>>();

  for (const m of involved) {
    const fKey = m.fellowshipId || "__none__";
    const cKey = m.cellId || "__none__";
    if (!felMap.has(fKey)) felMap.set(fKey, new Map());
    const cellMap = felMap.get(fKey)!;
    if (!cellMap.has(cKey)) cellMap.set(cKey, []);
    cellMap.get(cKey)!.push(m);
  }

  const felOrder = [
    ...fellowships.map((f) => f.id),
    "__none__",
  ].filter((id, i, arr) => arr.indexOf(id) === i);

  return felOrder
    .filter((fId) => felMap.has(fId))
    .map((fId) => {
      const cellMap = felMap.get(fId)!;
      const cellOrder = [
        ...cells.filter((c) => c.fellowshipId === fId || fId === "__none__").map((c) => c.id),
        "__none__",
      ].filter((id, i, arr) => arr.indexOf(id) === i && cellMap.has(id));

      return {
        fellowshipId: fId,
        fellowshipName: felName(fId === "__none__" ? null : fId),
        cells: cellOrder
          .filter((cId) => cellMap.has(cId))
          .map((cId) => ({
            cellId: cId,
            cellName: cellName(cId === "__none__" ? null : cId),
            members: cellMap
              .get(cId)!
              .sort((a, b) => a.name.localeCompare(b.name)),
          })),
      };
    });
}

function AttendanceEventDetail({
  record,
  members,
  cells,
  fellowships,
  currentUser,
  onBack,
  onSaved,
}: {
  record: AttendanceRecord;
  members: Member[];
  cells: Cell[];
  fellowships: Fellowship[];
  currentUser: Member;
  onBack: () => void;
  onSaved: () => void;
}) {
  const canEdit = canEditCellAttendance(currentUser.role, record, currentUser);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [present, setPresent] = useState<Set<string>>(() => new Set(record.presentIds));

  const editRoster =
    record.type === "cell" && record.cellId
      ? members.filter((m) => m.active && m.cellId === record.cellId).sort((a, b) => a.name.localeCompare(b.name))
      : members
          .filter((m) => m.active && (record.presentIds.includes(m.id) || record.absentIds.includes(m.id)))
          .sort((a, b) => a.name.localeCompare(b.name));

  const groups = groupMembersByFellowshipAndCell(record, members, cells, fellowships);
  const presentCount = editing ? present.size : record.presentIds.length;
  const absentCount = editing ? editRoster.length - present.size : record.absentIds.length;

  const togglePresent = (id: string) => {
    const next = new Set(present);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPresent(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const presentIds = [...present];
      const absentIds = editRoster.map((m) => m.id).filter((id) => !presentIds.includes(id));
      await api(`/attendance/${record.id}`, {
        method: "PUT",
        body: JSON.stringify({ presentIds, absentIds, newcomerIds: record.newcomerIds || [], guests: record.guests || [] }),
      });
      setEditing(false);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onBack}
          className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition hover:bg-muted"
          aria-label="Back to day events"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <IconBox
          icon={record.type === "service" ? Church : Network}
          tone={record.type === "service" ? "blue" : "cyan"}
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold">{eventLabel(record, cells)}</h2>
          <p className="text-sm text-muted-foreground">{record.date}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge color="emerald">{presentCount} present</Badge>
            <Badge color="rose">{absentCount} absent</Badge>
            {(record.guests?.length ?? 0) > 0 && (
              <Badge color="violet">{record.guests!.length} guest{record.guests!.length === 1 ? "" : "s"}</Badge>
            )}
          </div>
        </div>
        {canEdit && !editing && (
          <Btn variant="secondary" className="!px-3 !py-2" onClick={() => { setPresent(new Set(record.presentIds)); setEditing(true); }}>
            <Edit className="h-4 w-4" /> Edit
          </Btn>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Update who was present for this cell meeting.</p>
          <ul className="space-y-2">
            {editRoster.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <label className="flex flex-1 cursor-pointer items-center gap-3">
                  <input type="checkbox" checked={present.has(m.id)} onChange={() => togglePresent(m.id)} />
                  <AvatarCircle name={m.name} size="sm" />
                  <span className="text-sm font-medium">{m.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <Btn onClick={save} disabled={saving}>{saving ? "Saving..." : "Save changes"}</Btn>
            <Btn variant="ghost" onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </div>
      ) : (
      <div className="space-y-4">
        {groups.map((fel) => (
          <div key={fel.fellowshipId} className="rounded-xl border border-border bg-muted/20 p-4">
            <div className="mb-3 flex items-center gap-2">
              <IconBox icon={Building2} tone="indigo" size="sm" />
              <h3 className="font-semibold">{fel.fellowshipName}</h3>
            </div>
            <div className="space-y-3">
              {fel.cells.map((cell) => (
                <div key={cell.cellId} className="rounded-lg border bg-card p-3">
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                    <Network className="h-3.5 w-3.5" />
                    {cell.cellName}
                  </p>
                  <ul className="space-y-2">
                    {cell.members.map((m) => {
                      const status = memberStatus(record, m.id)!;
                      const isNew = record.newcomerIds?.includes(m.id);
                      return (
                        <li
                          key={m.id}
                          className="flex items-center justify-between gap-2 rounded-lg bg-muted/30 px-3 py-2 text-sm"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <AvatarCircle name={m.name} size="sm" />
                            <div className="min-w-0">
                              <p className="truncate font-medium">{m.name}</p>
                              <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {isNew && <Badge color="violet">New</Badge>}
                            {status === "present" ? (
                              <Badge color="emerald"><UserCheck className="mr-1 inline h-3 w-3" />Present</Badge>
                            ) : (
                              <Badge color="rose"><UserX className="mr-1 inline h-3 w-3" />Absent</Badge>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      )}

      {!editing && (record.guests?.length ?? 0) > 0 && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="mb-2 text-sm font-semibold">First-time guests</p>
          <div className="flex flex-wrap gap-1.5">
            {record.guests!.map((g) => (
              <Badge key={g.name} color="violet">{g.name}</Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export function AttendanceCalendarView({
  records,
  members,
  cells,
  fellowships,
  currentUser,
  onRecordUpdated,
}: {
  records: AttendanceRecord[];
  members: Member[];
  cells: Cell[];
  fellowships: Fellowship[];
  currentUser: Member;
  onRecordUpdated?: () => void;
}) {
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => b.date.localeCompare(a.date) || a.type.localeCompare(b.type)),
    [records]
  );

  const latestDate = sortedRecords[0]?.date;
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    latestDate ? parseISO(latestDate) : new Date()
  );
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);

  const { dayTotals, attendanceDates } = useMemo(() => {
    const totals: Record<string, number> = {};
    const dates = new Set<string>();
    for (const r of sortedRecords) {
      dates.add(r.date);
      totals[r.date] = (totals[r.date] || 0) + r.presentIds.length;
    }
    return { dayTotals: totals, attendanceDates: dates };
  }, [sortedRecords]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dayRecords = sortedRecords.filter((r) => r.date === selectedKey);
  const dayTotal = dayTotals[selectedKey] || 0;
  const selectedRecord = sortedRecords.find((r) => r.id === selectedRecordId) || null;

  const DayContentWithTotal = useCallback(
    ({ date }: DayContentProps) => {
      const key = format(date, "yyyy-MM-dd");
      const total = dayTotals[key];
      return (
        <span className="relative flex h-full w-full flex-col items-center justify-center leading-none">
          <span>{date.getDate()}</span>
          {total > 0 && (
            <span className="mt-0.5 text-[9px] font-semibold text-primary">{total}</span>
          )}
        </span>
      );
    },
    [dayTotals]
  );

  const modifiers = {
    hasAttendance: (date: Date) => attendanceDates.has(format(date, "yyyy-MM-dd")),
  };

  const modifiersClassNames = {
    hasAttendance: "font-semibold",
  };

  if (selectedRecord) {
    return (
      <AttendanceEventDetail
        record={selectedRecord}
        members={members}
        cells={cells}
        fellowships={fellowships}
        currentUser={currentUser}
        onBack={() => setSelectedRecordId(null)}
        onSaved={() => {
          onRecordUpdated?.();
          setSelectedRecordId(null);
        }}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
      <Card className="p-3 sm:p-4">
        <h2 className="mb-3 px-1 text-sm font-semibold">Attendance calendar</h2>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            setSelectedDate(d);
            setSelectedRecordId(null);
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          components={{ DayContent: DayContentWithTotal }}
          classNames={{
            day: "h-11 w-11 p-0 font-normal aria-selected:opacity-100",
            cell: "h-11 w-11 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          }}
          className="w-full rounded-lg border-0 p-0 pointer-events-auto"
        />
        <p className="mt-3 px-1 text-xs text-muted-foreground">
          Numbers under each date show total present that day. Select a day to view events.
        </p>
        {Object.keys(dayTotals).length > 0 && (
          <div className="mt-4 max-h-40 space-y-1 overflow-y-auto border-t pt-3">
            {Object.entries(dayTotals)
              .sort(([a], [b]) => b.localeCompare(a))
              .slice(0, 8)
              .map(([date, total]) => (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(parseISO(date));
                    setSelectedRecordId(null);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-left text-xs transition hover:bg-muted",
                    selectedKey === date && "bg-primary/10 font-medium text-primary"
                  )}
                >
                  <span>{date}</span>
                  <span className="text-muted-foreground">{total} present</span>
                </button>
              ))}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-4 sm:p-5">
          <h2 className="text-lg font-semibold">
            {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a date"}
          </h2>
          {selectedDate && dayRecords.length > 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {dayRecords.length} event{dayRecords.length === 1 ? "" : "s"} · {dayTotal} total present
            </p>
          ) : selectedDate ? (
            <p className="mt-1 text-sm text-muted-foreground">No attendance recorded on this day.</p>
          ) : null}
        </Card>

        {dayRecords.length > 0 ? (
          <div className="space-y-3">
            {dayRecords.map((r) => {
              const present = r.presentIds.length;
              const absent = r.absentIds.length;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRecordId(r.id)}
                  className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition hover:border-primary/30 hover:bg-muted/30"
                >
                  <IconBox
                    icon={r.type === "service" ? Church : Network}
                    tone={r.type === "service" ? "blue" : "cyan"}
                    size="md"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{eventLabel(r, cells)}</p>
                    <p className="text-xs text-muted-foreground">
                      {present} present · {absent} absent
                      {(r.guests?.length ?? 0) > 0 ? ` · ${r.guests!.length} guest${r.guests!.length === 1 ? "" : "s"}` : ""}
                    </p>
                  </div>
                  <Badge color="sky">{present} attended</Badge>
                </button>
              );
            })}
          </div>
        ) : selectedDate ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            No attendance recorded on this day. Use <strong className="text-foreground">Add New Attendance</strong> to record a meeting.
          </Card>
        ) : null}
      </div>
    </div>
  );
}
