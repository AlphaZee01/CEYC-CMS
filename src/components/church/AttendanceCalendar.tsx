import { useMemo, useState, useCallback, useEffect } from "react";
import { format, parseISO } from "date-fns";
import type { DayContentProps } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Card, Badge, IconBox, AvatarCircle, Btn, cn } from "@/components/church/ui";
import { Church, Network, Building2, UserCheck, ChevronLeft, Edit, Users } from "lucide-react";
import { api } from "@/lib/api";
import { canEditCellAttendance } from "@/lib/rbac";
import { attendanceEventLabel } from "@/components/church/AttendanceUI";
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

/** Present members only, sorted fellowship → cell → name. */
export function groupPresentByFellowshipAndCell(
  record: AttendanceRecord,
  members: Member[],
  cells: Cell[],
  fellowships: Fellowship[]
) {
  const presentMembers = record.presentIds
    .map((id) => members.find((m) => m.id === id))
    .filter((m): m is Member => !!m)
    .sort((a, b) => a.name.localeCompare(b.name));

  const felName = (id: string | null | undefined) =>
    fellowships.find((f) => f.id === id)?.name || "Other";
  const cellName = (id: string | null | undefined) =>
    cells.find((c) => c.id === id)?.name || "No cell";

  const felMap = new Map<string, Map<string, Member[]>>();

  for (const m of presentMembers) {
    const fKey = m.fellowshipId || "__none__";
    const cKey = m.cellId || "__none__";
    if (!felMap.has(fKey)) felMap.set(fKey, new Map());
    const cellMap = felMap.get(fKey)!;
    if (!cellMap.has(cKey)) cellMap.set(cKey, []);
    cellMap.get(cKey)!.push(m);
  }

  const felOrder = [...fellowships.map((f) => f.id), "__none__"].filter((id, i, arr) => arr.indexOf(id) === i);

  return felOrder
    .filter((fId) => felMap.has(fId))
    .map((fId) => {
      const cellMap = felMap.get(fId)!;
      const cellOrder = [
        ...cells
          .filter((c) => c.fellowshipId === fId || (fId === "__none__" && !c.fellowshipId))
          .map((c) => c.id),
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
            members: cellMap.get(cId)!.sort((a, b) => a.name.localeCompare(b.name)),
          })),
      };
    });
}

function PresentByFellowshipList({
  record,
  members,
  cells,
  fellowships,
}: {
  record: AttendanceRecord;
  members: Member[];
  cells: Cell[];
  fellowships: Fellowship[];
}) {
  const groups = groupPresentByFellowshipAndCell(record, members, cells, fellowships);
  const presentCount = record.presentIds.length;

  if (presentCount === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">No one was marked present for this meeting.</p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((fel) => (
        <section key={fel.fellowshipId}>
          <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
            <IconBox icon={Building2} tone="indigo" size="sm" />
            <h3 className="font-semibold text-foreground">{fel.fellowshipName}</h3>
            <span className="text-xs text-muted-foreground">
              {fel.cells.reduce((n, c) => n + c.members.length, 0)} present
            </span>
          </div>
          <div className="space-y-4 pl-0 sm:pl-1">
            {fel.cells.map((cell) => (
              <div key={cell.cellId}>
                <p className="mb-2 flex items-center gap-1.5 text-sm font-medium text-primary">
                  <Network className="h-3.5 w-3.5 shrink-0" />
                  {cell.cellName}
                  <span className="font-normal text-muted-foreground">({cell.members.length})</span>
                </p>
                <ul className="space-y-1.5">
                  {cell.members.map((m) => {
                    const isNew = record.newcomerIds?.includes(m.id);
                    return (
                      <li
                        key={m.id}
                        className="flex items-center gap-2.5 rounded-lg bg-emerald-500/5 px-3 py-2 text-sm ring-1 ring-emerald-500/10"
                      >
                        <AvatarCircle name={m.name} size="sm" />
                        <span className="min-w-0 flex-1 truncate font-medium">{m.name}</span>
                        {isNew && <Badge color="violet">New</Badge>}
                        <UserCheck className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      ))}

      {(record.guests?.length ?? 0) > 0 && (
        <section className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
          <p className="mb-2 text-sm font-semibold">Guests</p>
          <ul className="flex flex-wrap gap-1.5">
            {record.guests!.map((g) => (
              <Badge key={g.name} color="violet">{g.name}</Badge>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function AttendanceMeetingEditor({
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
  const [present, setPresent] = useState<Set<string>>(() => new Set(record.presentIds));
  const [saving, setSaving] = useState(false);

  const editRoster =
    record.type === "cell" && record.cellId
      ? members.filter((m) => m.active && m.cellId === record.cellId).sort((a, b) => a.name.localeCompare(b.name))
      : members
          .filter((m) => m.active && (record.presentIds.includes(m.id) || record.absentIds.includes(m.id)))
          .sort((a, b) => a.name.localeCompare(b.name));

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
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-muted"
          aria-label="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <h2 className="font-semibold">Edit {attendanceEventLabel(record, cells)}</h2>
      </div>
      <ul className="mb-4 max-h-72 space-y-2 overflow-y-auto">
        {editRoster.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              onClick={() => togglePresent(m.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border p-3 text-left text-sm",
                present.has(m.id) ? "border-emerald-500/40 bg-emerald-500/5" : "hover:bg-muted/50"
              )}
            >
              <span className={cn("h-4 w-4 rounded border", present.has(m.id) && "border-emerald-500 bg-emerald-500")} />
              {m.name}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Btn onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Btn>
        <Btn variant="ghost" onClick={onBack}>Cancel</Btn>
      </div>
    </Card>
  );
}

function AttendanceDayPanel({
  dateKey,
  dayRecords,
  dayTotal,
  members,
  cells,
  fellowships,
  currentUser,
  selectedMeetingId,
  onSelectMeeting,
  onEdit,
  editing,
  onEditDone,
}: {
  dateKey: string;
  dayRecords: AttendanceRecord[];
  dayTotal: number;
  members: Member[];
  cells: Cell[];
  fellowships: Fellowship[];
  currentUser: Member;
  selectedMeetingId: string;
  onSelectMeeting: (id: string) => void;
  onEdit: () => void;
  editing: boolean;
  onEditDone: () => void;
}) {
  const record = dayRecords.find((r) => r.id === selectedMeetingId) || dayRecords[0];
  if (!record) return null;

  const canEdit = canEditCellAttendance(currentUser.role, record, currentUser);

  if (editing) {
    return (
      <AttendanceMeetingEditor
        record={record}
        members={members}
        cells={cells}
        fellowships={fellowships}
        currentUser={currentUser}
        onBack={onEditDone}
        onSaved={onEditDone}
      />
    );
  }

  const absentCount = record.absentIds.length;

  return (
    <Card className="flex flex-col overflow-hidden p-0">
      <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
        <p className="text-sm text-muted-foreground">{format(parseISO(dateKey), "EEEE, MMMM d, yyyy")}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-3xl font-bold tracking-tight text-emerald-600">{dayTotal}</p>
            <p className="text-sm font-medium text-foreground">
              {dayTotal === 1 ? "person present" : "people present"} this day
            </p>
          </div>
          {canEdit && (
            <Btn variant="secondary" className="!px-3 !py-2" onClick={onEdit}>
              <Edit className="h-4 w-4" /> Edit
            </Btn>
          )}
        </div>
      </div>

      {dayRecords.length > 1 && (
        <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3 sm:px-5">
          {dayRecords.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelectMeeting(r.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                selectedMeetingId === r.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {attendanceEventLabel(r, cells)} ({r.presentIds.length})
            </button>
          ))}
        </div>
      )}

      <div className="border-b border-border px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <IconBox icon={record.type === "service" ? Church : Network} tone={record.type === "service" ? "blue" : "cyan"} size="sm" />
          <div>
            <p className="font-semibold">{attendanceEventLabel(record, cells)}</p>
            <p className="text-xs text-muted-foreground">
              {record.presentIds.length} present
              {absentCount > 0 ? ` · ${absentCount} absent` : ""}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Listed below by fellowship, then cell.
        </p>
      </div>

      <div className="max-h-[min(60vh,32rem)] overflow-y-auto px-4 py-4 sm:px-5">
        <PresentByFellowshipList record={record} members={members} cells={cells} fellowships={fellowships} />
      </div>
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
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const dayTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const r of sortedRecords) {
      totals[r.date] = (totals[r.date] || 0) + r.presentIds.length;
    }
    return totals;
  }, [sortedRecords]);

  const attendanceDates = useMemo(() => new Set(Object.keys(dayTotals)), [dayTotals]);

  const selectedKey = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const dayRecords = sortedRecords.filter((r) => r.date === selectedKey);
  const dayTotal = dayTotals[selectedKey] || 0;

  useEffect(() => {
    if (dayRecords.length === 0) {
      setSelectedMeetingId(null);
      return;
    }
    const preferred =
      dayRecords.find((r) => r.type === "service")?.id || dayRecords[0].id;
    if (!selectedMeetingId || !dayRecords.some((r) => r.id === selectedMeetingId)) {
      setSelectedMeetingId(preferred);
    }
  }, [selectedKey, dayRecords, selectedMeetingId]);

  const DayContentWithCount = useCallback(
    ({ date }: DayContentProps) => {
      const key = format(date, "yyyy-MM-dd");
      const count = dayTotals[key] || 0;
      const isSelected = selectedKey === key;
      return (
        <span className="flex h-full w-full flex-col items-center justify-center gap-0.5">
          <span className="text-sm leading-none">{date.getDate()}</span>
          {count > 0 ? (
            <span
              className={cn(
                "min-w-[1.25rem] rounded-full px-1 py-0.5 text-[10px] font-bold leading-none",
                isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500 text-white"
              )}
            >
              {count}
            </span>
          ) : (
            <span className="h-[18px]" aria-hidden />
          )}
        </span>
      );
    },
    [dayTotals, selectedKey]
  );

  const modifiers = {
    hasAttendance: (date: Date) => attendanceDates.has(format(date, "yyyy-MM-dd")),
  };

  const modifiersClassNames = {
    hasAttendance: "font-semibold",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,18rem)_1fr]">
      <Card className="p-3 sm:p-4">
        <p className="mb-1 px-1 text-sm font-semibold">Calendar</p>
        <p className="mb-3 px-1 text-xs text-muted-foreground">
          Green number = how many were present that day. Tap a day to see names.
        </p>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(d) => {
            setSelectedDate(d);
            setEditing(false);
          }}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          components={{ DayContent: DayContentWithCount }}
          classNames={{
            day: cn(
              "h-12 w-12 p-0 font-normal aria-selected:opacity-100",
              "has-[[data-count]]:font-semibold"
            ),
            cell: "h-12 w-12 text-center text-sm p-0 relative",
            day_selected: "bg-primary text-primary-foreground",
          }}
          className="w-full rounded-lg border-0 p-0 pointer-events-auto"
        />
      </Card>

      <div className="min-w-0">
        {!selectedDate && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <IconBox icon={Users} tone="sky" size="lg" />
            <p className="text-sm text-muted-foreground">Select a date on the calendar to see who was present.</p>
          </Card>
        )}

        {selectedDate && dayRecords.length === 0 && (
          <Card className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm font-medium">No attendance on this day</p>
            <p className="text-sm text-muted-foreground">
              {format(selectedDate, "MMMM d, yyyy")} has no records yet.
            </p>
          </Card>
        )}

        {selectedDate && dayRecords.length > 0 && selectedMeetingId && (
          <AttendanceDayPanel
            dateKey={selectedKey}
            dayRecords={dayRecords}
            dayTotal={dayTotal}
            members={members}
            cells={cells}
            fellowships={fellowships}
            currentUser={currentUser}
            selectedMeetingId={selectedMeetingId}
            onSelectMeeting={(id) => {
              setSelectedMeetingId(id);
              setEditing(false);
            }}
            onEdit={() => setEditing(true)}
            editing={editing}
            onEditDone={() => {
              setEditing(false);
              onRecordUpdated?.();
            }}
          />
        )}
      </div>
    </div>
  );
}
