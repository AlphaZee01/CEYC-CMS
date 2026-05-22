import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Network,
  Building2,
  Wallet,
  Plus,
  Edit,
  Trash2,
  Download,
  Send,
  Search,
  Pin,
  Upload,
  Play,
  CheckCircle2,
  Circle,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
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
import { api, exportCSV } from "@/lib/api";
import { Card, Btn, Badge, Input, Select, Textarea, Modal, PageHeader, cn } from "@/components/church/ui";
import { EventCalendar } from "@/components/church/EventCalendar";
import { PAGE_META, type Member, type Cell, type Fellowship, type Department, type PageId, type Role } from "@/types/church";

export const CHART_COLORS = ["#5B21B6", "#0D9488", "#F97316", "#8B5CF6", "#14B8A6", "#FB7185"];

export const PAGE_ACCESS: Record<Role, PageId[]> = {
  "Senior Pastor": PAGE_META.map((p) => p.id),
  "Associate Pastor": PAGE_META.map((p) => p.id).filter((id) => id !== "settings" && id !== "finances"),
  Admin: ["dashboard", "members", "attendance", "finances", "settings", "announcements", "tasks", "communications"],
  "Fellowship Leader": ["dashboard", "members", "cells", "attendance", "communications", "report-submissions", "announcements", "events"],
  "Cell Leader": ["dashboard", "members", "attendance", "communications", "report-submissions", "announcements", "events", "prayer"],
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

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: string | number; icon: typeof Users; accent?: string }) {
  return (
    <Card className="flex items-start justify-between">
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-[hsl(262,52%,32%)]">{value}</p>
      </div>
      <div className={cn("rounded-lg p-2.5", accent || "bg-[hsl(262,52%,32%)]/10")}>
        <Icon className={cn("h-5 w-5", accent ? "text-white" : "text-[hsl(262,52%,32%)]")} />
      </div>
    </Card>
  );
}

function memberName(members: Member[], id: string | null | undefined) {
  if (!id) return "—";
  return members.find((m) => m.id === id)?.name || "—";
}

function isPastoral(role: Role) {
  return role === "Senior Pastor" || role === "Associate Pastor";
}

function canManageMembers(role: Role) {
  return !["Cell Member", "Church Member"].includes(role);
}

function canAccessFinances(role: Role) {
  return role === "Senior Pastor" || role === "Admin";
}

function canUploadMedia(role: Role) {
  return ["Senior Pastor", "Associate Pastor", "Admin"].includes(role);
}

function canManageSettings(role: Role) {
  return role === "Senior Pastor" || role === "Admin";
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export function DashboardPage({ members, currentUser }: PageProps) {
  const [stats, setStats] = useState({ members: 0, cells: 0, fellowships: 0, departments: 0 });
  const [activities, setActivities] = useState<{ id: string; text: string; time: string }[]>([]);
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time: string; rsvpIds: string[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api<typeof stats>("/dashboard/stats"),
      api<typeof activities>("/activities"),
      api<typeof events>("/events"),
    ])
      .then(([s, a, e]) => {
        setStats(s);
        setActivities(a);
        setEvents(e);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle={`Welcome back, ${currentUser.name}`} />
      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Members" value={stats.members} icon={Users} />
            <StatCard label="Cells" value={stats.cells} icon={Network} accent="bg-[hsl(174,55%,42%)]" />
            <StatCard label="Fellowships" value={stats.fellowships} icon={Building2} accent="bg-[hsl(12,85%,62%)]" />
            <StatCard label="Departments" value={stats.departments} icon={Building2} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h2 className="mb-4 font-semibold">Recent Activity</h2>
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
                    <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[hsl(174,55%,42%)]" />
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
        </>
      )}
    </div>
  );
}

// ─── Members ───────────────────────────────────────────────────────────────────

export function MembersPage({ members, cells, fellowships, departments, currentUser, onRefresh }: PageProps) {
  const [list, setList] = useState<Member[]>([]);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterCell, setFilterCell] = useState("");
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
        title="Members"
        subtitle="Directory & role management"
        action={
          canManageMembers(currentUser.role) ? (
            <Btn onClick={() => { setEdit({ role: "Church Member", active: true, departmentIds: [] }); setModal("add"); }}>
              <Plus className="h-4 w-4" /> Add Member
            </Btn>
          ) : undefined
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search members..." className="w-full rounded-lg border border-input py-2 pl-10 pr-3 text-sm" />
        </div>
        <Select value={filterRole} onChange={setFilterRole} options={[{ value: "", label: "All roles" }, ...ROLES.map((r) => ({ value: r, label: r }))]} />
        <Select value={filterCell} onChange={setFilterCell} options={[{ value: "", label: "All cells" }, ...cells.map((c) => ({ value: c.id, label: c.name }))]} />
        <Select value={filterFellowship} onChange={setFilterFellowship} options={[{ value: "", label: "All fellowships" }, ...fellowships.map((f) => ({ value: f.id, label: f.name }))]} />
        <Select value={filterDept} onChange={setFilterDept} options={[{ value: "", label: "All departments" }, ...departments.map((d) => ({ value: d.id, label: d.name }))]} />
      </div>
      <Card className="overflow-x-auto p-0">
        {loading ? (
          <p className="p-4 text-muted-foreground">Loading...</p>
        ) : (
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
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-4 py-3"><Badge color="purple">{m.role}</Badge></td>
                  <td className="hidden px-4 py-3 md:table-cell">{cells.find((c) => c.id === m.cellId)?.name || "—"}</td>
                  <td className="hidden px-4 py-3 lg:table-cell">{fellowships.find((f) => f.id === m.fellowshipId)?.name || "—"}</td>
                  <td className="px-4 py-3 text-right">
                    {canManageMembers(currentUser.role) && (
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
        )}
      </Card>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "add" ? "Add Member" : "Edit Member"}>
        <div className="space-y-3">
          <Input label="Full Name" value={edit.name || ""} onChange={(v) => setEdit((e) => ({ ...e, name: v }))} />
          <Input label="Email" value={edit.email || ""} onChange={(v) => setEdit((e) => ({ ...e, email: v }))} />
          <Input label="Phone" value={edit.phone || ""} onChange={(v) => setEdit((e) => ({ ...e, phone: v }))} />
          {modal === "add" && <Input label="Password (optional)" type="password" value={edit.password || ""} onChange={(v) => setEdit((e) => ({ ...e, password: v }))} />}
          <Select label="Role" value={edit.role || "Church Member"} onChange={(v) => setEdit((e) => ({ ...e, role: v as Role }))} options={ROLES.map((r) => ({ value: r, label: r }))} />
          <Select label="Cell" value={edit.cellId || ""} onChange={(v) => setEdit((e) => ({ ...e, cellId: v || null }))} options={[{ value: "", label: "None" }, ...cells.map((c) => ({ value: c.id, label: c.name }))]} />
          <Select label="Fellowship" value={edit.fellowshipId || ""} onChange={(v) => setEdit((e) => ({ ...e, fellowshipId: v || null }))} options={[{ value: "", label: "None" }, ...fellowships.map((f) => ({ value: f.id, label: f.name }))]} />
          {["Senior Pastor", "Admin"].includes(currentUser.role) && modal === "edit" && edit.id && (
            <Textarea label="Welfare / pastoral notes (Admin)" value={edit.welfareNotes || ""} onChange={(v) => setEdit((e) => ({ ...e, welfareNotes: v }))} />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Btn variant="ghost" onClick={() => setModal(null)}>Cancel</Btn>
            <Btn onClick={saveMember} disabled={saving}>{saving ? "Saving..." : "Save"}</Btn>
          </div>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cells & Fellowships"
        subtitle="Manage structure and leadership"
        action={
          canManageMembers(currentUser.role) ? (
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
              <h2 className="text-lg font-semibold text-[hsl(262,52%,32%)]">{f.name}</h2>
              <p className="text-sm text-muted-foreground">Leader: {memberName(members, f.leaderId)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="teal">{cells.filter((c) => c.fellowshipId === f.id).length} cells</Badge>
              {canManageMembers(currentUser.role) && (
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
                    Leader: {memberName(members, c.leaderId)} · Sub: {memberName(members, c.subLeaderId)} · {cellMembers.length} members
                  </p>
                  {canManageMembers(currentUser.role) && (
                    <Btn variant="ghost" className="mt-2 !px-0 !py-1 text-xs" onClick={() => {
                      setAssignModal({ type: "cell", id: c.id });
                      setAssignLeader(c.leaderId || "");
                      setAssignSubLeader(c.subLeaderId || "");
                    }}>Assign leaders</Btn>
                  )}
                  {expanded === c.id && (
                    <ul className="mt-3 space-y-1 border-t pt-2 text-sm">
                      {cellMembers.map((m) => (
                        <li key={m.id} className="flex justify-between"><span>{m.name}</span><Badge color="gray">{m.role}</Badge></li>
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
    </div>
  );
}

// ─── Departments ───────────────────────────────────────────────────────────────

export function DepartmentsPage({ members, departments: propDepts, onRefresh }: PageProps) {
  const [departments, setDepartments] = useState(propDepts);
  const [modal, setModal] = useState<"new" | "edit" | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", headId: "", memberIds: [] as string[] });

  const load = useCallback(() => {
    api<Department[]>("/departments").then(setDepartments).catch(() => setDepartments(propDepts));
  }, [propDepts]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name) return;
    if (modal === "new") {
      await api("/departments", { method: "POST", body: JSON.stringify({ name: form.name, headId: form.headId || null, memberIds: form.memberIds }) });
    } else if (editId) {
      await api(`/departments/${editId}`, { method: "PUT", body: JSON.stringify({ name: form.name, headId: form.headId || null, memberIds: form.memberIds }) });
    }
    setModal(null);
    setEditId(null);
    load();
    onRefresh();
  };

  const openEdit = (d: Department) => {
    setEditId(d.id);
    setForm({ name: d.name, headId: d.headId || "", memberIds: d.memberIds });
    setModal("edit");
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Ministry Departments" subtitle="Department heads and serving members" action={<Btn onClick={() => { setEditId(null); setForm({ name: "", headId: "", memberIds: [] }); setModal("new"); }}><Plus className="h-4 w-4" /> New Department</Btn>} />
      <div className="grid gap-4 md:grid-cols-2">
        {departments.map((d) => (
          <Card key={d.id}>
            <div className="flex justify-between">
              <h3 className="font-semibold">{d.name}</h3>
              <button type="button" className="rounded p-1 hover:bg-muted" onClick={() => openEdit(d)}><Edit className="h-4 w-4" /></button>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Head: {memberName(members, d.headId)}</p>
            <p className="mt-2 text-sm">{d.memberIds.length + (d.headId ? 1 : 0)} serving members</p>
            <ul className="mt-3 space-y-1 text-sm">
              {d.memberIds.slice(0, 6).map((mid) => <li key={mid}>{memberName(members, mid)}</li>)}
            </ul>
          </Card>
        ))}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === "new" ? "New Department" : "Edit Department"}>
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
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
    </div>
  );
}

// ─── Attendance ────────────────────────────────────────────────────────────────

export function AttendancePage({ members, cells, onRefresh }: PageProps) {
  const [trends, setTrends] = useState<{ date: string; cell_name: string; present_count: number }[]>([]);
  const [records, setRecords] = useState<{ id: string; date: string; type: string; cellId: string | null; presentIds: string[]; absentIds: string[] }[]>([]);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [cellId, setCellId] = useState(cells[0]?.id || "");
  const [present, setPresent] = useState<Set<string>>(new Set());

  const load = () => api<typeof records>("/attendance").then(setRecords).catch(() => {});

  useEffect(() => { load(); }, []);
  useEffect(() => {
    api<typeof trends>("/attendance/trends").then(setTrends).catch(() => {});
  }, []);

  const trendChart = trends.reduce<Record<string, Record<string, number | string>>>((acc, row) => {
    const week = row.date?.slice(0, 7) || "week";
    if (!acc[week]) acc[week] = { week };
    const key = (row.cell_name || "cell").split(" ")[0];
    acc[week][key] = row.present_count;
    return acc;
  }, {});
  const trendData = Object.values(trendChart).slice(-6);

  const cellMembers = members.filter((m) => m.cellId === cellId && m.active);

  const save = async () => {
    const presentIds = [...present];
    const absentIds = cellMembers.map((m) => m.id).filter((id) => !presentIds.includes(id));
    await api("/attendance", {
      method: "POST",
      body: JSON.stringify({ date, type: "cell", cellId, presentIds, absentIds }),
    });
    setPresent(new Set());
    load();
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance" subtitle="Record and review attendance" />
      <Card>
        <h2 className="mb-4 font-semibold">Record Attendance</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Date" type="date" value={date} onChange={setDate} />
          <Select label="Cell" value={cellId} onChange={setCellId} options={cells.map((c) => ({ value: c.id, label: c.name }))} />
        </div>
        <div className="mt-4 space-y-2">
          {cellMembers.map((m) => (
            <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
              <input type="checkbox" checked={present.has(m.id)} onChange={() => {
                const next = new Set(present);
                if (next.has(m.id)) next.delete(m.id); else next.add(m.id);
                setPresent(next);
              }} />
              <span>{m.name}</span>
            </label>
          ))}
        </div>
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
      <Card>
        <h2 className="mb-4 font-semibold">History</h2>
        {records.map((a) => (
          <div key={a.id} className="mb-3 flex justify-between border-b pb-3 text-sm last:border-0">
            <span>{a.date} — {cells.find((c) => c.id === a.cellId)?.name || a.type}</span>
            <Badge color="teal">{a.presentIds.length} present</Badge>
          </div>
        ))}
      </Card>
    </div>
  );
}

// ─── Events ────────────────────────────────────────────────────────────────────

export function EventsPage({ currentUser, onRefresh }: PageProps) {
  const [events, setEvents] = useState<{ id: string; title: string; date: string; time: string; location: string; description: string; rsvpIds: string[] }[]>([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const load = () => api<typeof events>("/events").then(setEvents).catch(() => {});

  useEffect(() => { load(); }, []);

  const create = async () => {
    await api("/events", { method: "POST", body: JSON.stringify(form) });
    setModal(false);
    setForm({ title: "", date: "", time: "", location: "", description: "" });
    load();
    onRefresh();
  };

  const rsvp = async (id: string) => {
    await api(`/events/${id}/rsvp`, { method: "POST" });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Events" subtitle="Church calendar and RSVPs" action={<Btn onClick={() => setModal(true)}><Plus className="h-4 w-4" /> New Event</Btn>} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-semibold">Calendar</h2>
          <EventCalendar
            events={events}
            selectedDate={selectedDate}
            onSelectDate={(d) => {
              setSelectedDate(d);
              if (d) setForm((f) => ({ ...f, date: d.toISOString().slice(0, 10) }));
            }}
          />
          <div className="mt-4 space-y-2">
            {events
              .filter((e) => !selectedDate || e.date === selectedDate.toISOString().slice(0, 10))
              .map((e) => (
                <div key={e.id} className="rounded-lg bg-[hsl(262,52%,32%)]/5 p-2 text-sm">
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
                </div>
                <Btn variant={e.rsvpIds.includes(currentUser.id) ? "secondary" : "accent"} onClick={() => rsvp(e.id)}>
                  {e.rsvpIds.includes(currentUser.id) ? "Cancel RSVP" : "RSVP"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Modal open={modal} onClose={() => setModal(false)} title="Create Event">
        <div className="space-y-3">
          <Input label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Input label="Date" type="date" value={form.date} onChange={(v) => setForm((f) => ({ ...f, date: v }))} />
          <Input label="Time" value={form.time} onChange={(v) => setForm((f) => ({ ...f, time: v }))} />
          <Input label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
          <Textarea label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
          <Btn onClick={create}>Create</Btn>
        </div>
      </Modal>
    </div>
  );
}

// ─── Reports ───────────────────────────────────────────────────────────────────

export function ReportsPage({ departments }: PageProps) {
  const [growth, setGrowth] = useState<{ month: string; members: number }[]>([]);
  const [deptData, setDeptData] = useState<{ name: string; value: number }[]>([]);
  const [trends, setTrends] = useState<{ date: string; cell_name: string; present_count: number }[]>([]);

  useEffect(() => {
    Promise.all([
      api<{ memberGrowth: typeof growth; departmentParticipation: typeof deptData }>("/reports/analytics"),
      api<typeof trends>("/attendance/trends"),
    ]).then(([analytics, trendRows]) => {
      setGrowth(analytics.memberGrowth.map((g) => ({ month: g.month?.slice(5) || g.month, members: g.members })));
      setDeptData(analytics.departmentParticipation.map((d) => ({ name: d.name.split(" ")[0], value: d.value })));
      setTrends(trendRows);
    }).catch(() => {});
  }, []);

  const trendByWeek = trends.reduce<Record<string, Record<string, number | string>>>((acc, row) => {
    const week = row.date.slice(0, 7);
    if (!acc[week]) acc[week] = { week };
    acc[week][row.cell_name?.split(" ")[0] || "cell"] = row.present_count;
    return acc;
  }, {});
  const barData = Object.values(trendByWeek).slice(-4);

  const handleExport = () => {
    exportCSV("church-report.csv", ["Metric", "Value"], [
      ["Departments", String(departments.length)],
      ["Growth months", String(growth.length)],
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Reports & Analytics" subtitle="Growth, attendance, and participation" action={<Btn variant="accent" onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Btn>} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Member Growth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={growth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke={CHART_COLORS[0]} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Attendance by Cell</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              {Object.keys(barData[0] || {}).filter((k) => k !== "week").map((key, i) => (
                <Bar key={key} dataKey={key} fill={CHART_COLORS[i % CHART_COLORS.length]} name={key} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Department Participation</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={deptData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {deptData.map((_, i) => (
                  <ChartCell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
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
      await api("/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.next }) });
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
      <PageHeader title="Settings" subtitle="Church profile and admin accounts" />
      <Card>
        <h2 className="mb-4 font-semibold">Change Password</h2>
        <p className="mb-3 text-sm text-muted-foreground">Account: {userAccount?.email}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input label="Current" type="password" value={pwForm.current} onChange={(v) => setPwForm((p) => ({ ...p, current: v }))} />
          <Input label="New" type="password" value={pwForm.next} onChange={(v) => setPwForm((p) => ({ ...p, next: v }))} />
          <Input label="Confirm" type="password" value={pwForm.confirm} onChange={(v) => setPwForm((p) => ({ ...p, confirm: v }))} />
        </div>
        {pwMsg && <p className="mt-2 text-sm text-[hsl(174,55%,42%)]">{pwMsg}</p>}
        <Btn className="mt-3" onClick={changePassword}>Update Password</Btn>
      </Card>
      <Card>
        <h2 className="mb-4 font-semibold">Church Information</h2>
        {settings.logoUrl && <img src={settings.logoUrl} alt="Church logo" className="mb-4 h-16 object-contain" />}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Church Name" value={settings.name} onChange={(v) => setSettings((s) => ({ ...s, name: v }))} />
          <Input label="Tagline" value={settings.tagline} onChange={(v) => setSettings((s) => ({ ...s, tagline: v }))} />
          <Input label="Address" value={settings.address} onChange={(v) => setSettings((s) => ({ ...s, address: v }))} />
          <Input label="Phone" value={settings.phone} onChange={(v) => setSettings((s) => ({ ...s, phone: v }))} />
          <Input label="Email" value={settings.email} onChange={(v) => setSettings((s) => ({ ...s, email: v }))} />
        </div>
        {canManageSettings(currentUser.role) && (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Logo file</label>
                <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] || null)} className="text-sm" />
              </div>
              <Btn variant="accent" onClick={uploadLogo} disabled={!logoFile}>Upload Logo</Btn>
            </div>
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

interface Message {
  id: string;
  fromId: string;
  toIds: string[];
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
  broadcast: boolean;
}

export function CommunicationsPage({ members, currentUser }: PageProps) {
  const [tab, setTab] = useState<"inbox" | "sent">("inbox");
  const [messages, setMessages] = useState<Message[]>([]);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [target, setTarget] = useState("");
  const [broadcast, setBroadcast] = useState(false);

  const load = () => api<Message[]>(`/messages?box=${tab}`).then(setMessages).catch(() => {});

  useEffect(() => { load(); }, [tab]);

  const send = async () => {
    if (!subject || !body) return;
    await api("/messages", {
      method: "POST",
      body: JSON.stringify({
        subject,
        body,
        broadcast,
        toIds: broadcast ? undefined : target ? [target] : [],
      }),
    });
    setSubject("");
    setBody("");
    setTarget("");
    setBroadcast(false);
    setTab("sent");
    load();
  };

  const recipientOptions = [
    { value: "", label: "Select recipient..." },
    ...(currentUser.role === "Senior Pastor" || currentUser.role === "Admin"
      ? [{ value: "__broadcast__", label: "Broadcast — All Members" }]
      : []),
    ...members.filter((m) => m.active && m.id !== currentUser.id).map((m) => ({ value: m.id, label: `${m.name} (${m.role})` })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Communications" subtitle="Messages and broadcasts" />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Compose</h2>
          <div className="space-y-3">
            <Select
              label="Recipient"
              value={broadcast ? "__broadcast__" : target}
              onChange={(v) => {
                if (v === "__broadcast__") { setBroadcast(true); setTarget(""); }
                else { setBroadcast(false); setTarget(v); }
              }}
              options={recipientOptions}
            />
            <Input label="Subject" value={subject} onChange={setSubject} />
            <Textarea label="Message" value={body} onChange={setBody} rows={5} />
            <Btn onClick={send}><Send className="h-4 w-4" /> Send</Btn>
          </div>
        </Card>
        <Card>
          <div className="mb-4 flex gap-2">
            <button type="button" onClick={() => setTab("inbox")} className={cn("rounded-lg px-3 py-1 text-sm", tab === "inbox" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>Inbox</button>
            <button type="button" onClick={() => setTab("sent")} className={cn("rounded-lg px-3 py-1 text-sm", tab === "sent" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>Sent</button>
          </div>
          {messages.map((m) => (
            <div key={m.id} className="mb-3 rounded-lg border p-3 text-sm">
              <p className="font-medium">{m.subject} {m.broadcast && <Badge color="coral">Broadcast</Badge>}</p>
              <p className="text-xs text-muted-foreground">
                {tab === "inbox" ? `From: ${memberName(members, m.fromId)}` : "Sent"} · {new Date(m.sentAt).toLocaleDateString()}
              </p>
              <p className="mt-2">{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-sm text-muted-foreground">No messages</p>}
        </Card>
      </div>
    </div>
  );
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
}

export function FinancesPage({ members, currentUser }: PageProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [tithes, setTithes] = useState<{ memberId: string | null; memberName: string; total: number; records: FinanceRecord[] }[]>([]);
  const [tab, setTab] = useState<"ledger" | "transactions">("ledger");
  const [form, setForm] = useState({ type: "income" as "income" | "expense", category: "Tithe", amount: "", description: "", memberId: "" });

  const load = () => {
    api<FinanceRecord[]>("/finances").then(setRecords).catch(() => {});
    api<{ ledger: typeof tithes }>("/finances/tithes").then((d) => setTithes(d.ledger)).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  if (!canAccessFinances(currentUser.role)) {
    return <Card><p className="text-muted-foreground">You do not have access to finances.</p></Card>;
  }

  const income = records.filter((f) => f.type === "income").reduce((s, f) => s + f.amount, 0);
  const expenses = records.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0);

  const save = async () => {
    if (!form.amount) return;
    await api("/finances", {
      method: "POST",
      body: JSON.stringify({
        date: new Date().toISOString().slice(0, 10),
        type: form.type,
        category: form.category,
        amount: Number(form.amount),
        description: form.description,
        memberId: form.memberId || null,
      }),
    });
    setForm({ type: "income", category: "Tithe", amount: "", description: "" });
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Finances"
        subtitle="Income, expenses, and reporting"
        action={
          <Btn variant="accent" onClick={() => exportCSV("finances.csv", ["Date", "Type", "Category", "Amount", "Description"], records.map((f) => [f.date, f.type, f.category, String(f.amount), f.description]))}>
            <Download className="h-4 w-4" /> Export
          </Btn>
        }
      />
      <div className="flex gap-2">
        <button type="button" onClick={() => setTab("ledger")} className={cn("rounded-lg px-3 py-1 text-sm", tab === "ledger" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>Tithe Ledger</button>
        <button type="button" onClick={() => setTab("transactions")} className={cn("rounded-lg px-3 py-1 text-sm", tab === "transactions" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>All Transactions</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total Income" value={`₦${income.toLocaleString()}`} icon={Wallet} />
        <StatCard label="Total Expenses" value={`₦${expenses.toLocaleString()}`} icon={Wallet} accent="bg-[hsl(12,85%,62%)]" />
        <StatCard label="Balance" value={`₦${(income - expenses).toLocaleString()}`} icon={Wallet} accent="bg-[hsl(174,55%,42%)]" />
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Record Transaction</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Select label="Type" value={form.type} onChange={(v) => setForm((f) => ({ ...f, type: v as "income" | "expense" }))} options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
          <Select label="Category" value={form.category} onChange={(v) => setForm((f) => ({ ...f, category: v }))} options={["Tithe", "Offering", "Seed", "Project Fund", "Bills", "Outreach", "Events"].map((c) => ({ value: c, label: c }))} />
          <Select label="Member (for tithe/offering)" value={form.memberId} onChange={(v) => setForm((f) => ({ ...f, memberId: v }))} options={[{ value: "", label: "General / Anonymous" }, ...members.map((m) => ({ value: m.id, label: m.name }))]} />
          <Input label="Amount (₦)" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} />
          <Input label="Description" value={form.description} onChange={(v) => setForm((f) => ({ ...f, description: v }))} />
        </div>
        <Btn className="mt-4" onClick={save}>Save</Btn>
      </Card>
      {tab === "ledger" && (
        <Card>
          <h2 className="mb-4 font-semibold">Member Tithe & Offering Ledger</h2>
          {tithes.map((t) => (
            <div key={t.memberId || "anon"} className="mb-4 border-b pb-4 last:border-0">
              <div className="flex justify-between font-medium">
                <span>{t.memberName}</span>
                <span>₦{t.total.toLocaleString()}</span>
              </div>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {t.records.map((r) => (
                  <li key={r.id}>{r.date} — {r.category}: ₦{r.amount.toLocaleString()}</li>
                ))}
              </ul>
            </div>
          ))}
        </Card>
      )}
      {tab === "transactions" && <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
          <tbody>
            {records.map((f) => (
              <tr key={f.id} className="border-t">
                <td className="px-4 py-2">{f.date}</td>
                <td className="px-4 py-2"><Badge color={f.type === "income" ? "teal" : "coral"}>{f.type}</Badge></td>
                <td className="px-4 py-2">{f.category}</td>
                <td className="px-4 py-2 text-right font-medium">₦{f.amount.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>}
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

  const isMember = ["Cell Member", "Church Member"].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Prayer Requests" subtitle="Submit and track prayer needs" />
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
              {p.response && <p className="mt-2 text-sm text-[hsl(174,55%,42%)]">Response: {p.response}</p>}
            </div>
            {!isMember && (
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
  stage: "Visitor" | "New Convert" | "Cell Member" | "Worker";
  assignedToId: string | null;
  notes: { date: string; text: string; outcome: string }[];
  createdAt: string;
}

export function DiscipleshipPage({ members, currentUser, onRefresh }: PageProps) {
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [addModal, setAddModal] = useState(false);
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [newFu, setNewFu] = useState({ name: "", contact: "", stage: "Visitor" as FollowUp["stage"] });
  const [note, setNote] = useState({ text: "", outcome: "" });

  const load = () => api<FollowUp[]>("/follow-ups").then(setFollowUps).catch(() => {});

  useEffect(() => { load(); }, []);

  const addFollowUp = async () => {
    await api("/follow-ups", { method: "POST", body: JSON.stringify({ ...newFu, assignedToId: currentUser.id }) });
    setAddModal(false);
    setNewFu({ name: "", contact: "", stage: "Visitor" });
    load();
    onRefresh();
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
      <PageHeader title="Discipleship & Follow-up" subtitle="Track visitors and new converts" action={<Btn onClick={() => setAddModal(true)}><Plus className="h-4 w-4" /> Add</Btn>} />
      {followUps.map((fu) => (
        <Card key={fu.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">{fu.name}</h3>
              <p className="text-sm text-muted-foreground">{fu.contact}</p>
              <p className="text-xs text-muted-foreground">Assigned: {memberName(members, fu.assignedToId)}</p>
              <Badge color="purple" className="mt-2">{fu.stage}</Badge>
            </div>
            <div className="flex flex-col gap-2">
              <Select value={fu.stage} onChange={(v) => updateStage(fu.id, v as FollowUp["stage"])} options={["Visitor", "New Convert", "Cell Member", "Worker"].map((s) => ({ value: s, label: s }))} />
              <Btn variant="ghost" onClick={() => setNoteModal(fu.id)}>Add Note</Btn>
            </div>
          </div>
          {fu.notes.map((n, i) => (
            <p key={i} className="mt-2 border-l-2 border-[hsl(174,55%,42%)] pl-3 text-sm">{n.date}: {n.text} — <em>{n.outcome}</em></p>
          ))}
        </Card>
      ))}
      <Modal open={addModal} onClose={() => setAddModal(false)} title="New Follow-up">
        <div className="space-y-3">
          <Input label="Name" value={newFu.name} onChange={(v) => setNewFu((f) => ({ ...f, name: v }))} />
          <Input label="Contact" value={newFu.contact} onChange={(v) => setNewFu((f) => ({ ...f, contact: v }))} />
          <Select label="Stage" value={newFu.stage} onChange={(v) => setNewFu((f) => ({ ...f, stage: v as FollowUp["stage"] }))} options={["Visitor", "New Convert", "Cell Member", "Worker"].map((s) => ({ value: s, label: s }))} />
          <Btn onClick={addFollowUp}>Create</Btn>
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

  const canPost = !["Cell Member", "Church Member"].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Announcements" subtitle="Targeted church notices" action={canPost ? <Btn onClick={() => setModal(true)}><Plus className="h-4 w-4" /> Post</Btn> : undefined} />
      {announcements.map((a) => (
        <Card key={a.id} className={a.pinned ? "border-[hsl(12,85%,62%)]" : ""}>
          <div className="flex flex-wrap items-start gap-2">
            {a.pinned && <Pin className="h-4 w-4 text-[hsl(12,85%,62%)]" />}
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
  dueDate: string;
  priority: "low" | "medium" | "high";
  status: "pending" | "in_progress" | "completed";
}

export function TasksPage({ members, departments, currentUser }: PageProps) {
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

  const canCreate = ["Senior Pastor", "Associate Pastor", "Admin"].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks & Assignments" subtitle="Ministry tasks with notifications" action={canCreate ? <Btn onClick={() => setModal(true)}><Plus className="h-4 w-4" /> New Task</Btn> : undefined} />
      {tasks.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">Due: {t.dueDate}</p>
              <p className="mt-1 text-sm">{t.description}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Assignees: {t.assigneeIds.map((id) => memberName(members, id)).join(", ") || "—"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={t.priority === "high" ? "coral" : t.priority === "medium" ? "teal" : "gray"}>{t.priority}</Badge>
              <button type="button" onClick={() => toggleStatus(t)}>
                {t.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-[hsl(174,55%,42%)]" /> : <Circle className="h-5 w-5" />}
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
}

export function MediaPage({ currentUser }: PageProps) {
  const [media, setMedia] = useState<MediaItem[]>([]);
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
    setForm({ title: "", type: "video", speaker: "", series: "", topic: "", date: "" });
    setFile(null);
    load();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Media Library"
        subtitle="Sermons, notes, and teaching resources"
        action={canUploadMedia(currentUser.role) ? <Btn onClick={() => setUploadOpen(true)}><Upload className="h-4 w-4" /> Upload</Btn> : undefined}
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search sermons..." className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {media.map((m) => (
          <Card key={m.id}>
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[hsl(262,52%,32%)]/10">
                {m.type === "video" ? <Play className="h-6 w-6 text-[hsl(262,52%,32%)]" /> : <FileText className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.speaker} · {m.series}</p>
                <p className="text-xs text-muted-foreground">{m.date} · {m.topic}</p>
                {m.fileUrl && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(m.type === "video" || m.type === "audio") && (
                      <Btn variant="accent" className="!px-2 !py-1 text-xs" onClick={() => setPlaying(m)}>
                        <Play className="h-3 w-3" /> Play
                      </Btn>
                    )}
                    <a href={m.fileUrl} download className="inline-flex items-center gap-1 text-sm text-[hsl(174,55%,42%)]">
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
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
  prayerPoints: string;
  challenges: string;
  status: "draft" | "submitted" | "approved" | "overdue";
  pastorComment?: string;
  submittedAt: string;
}

export function ReportSubmissionsPage({ members, cells, departments, currentUser, onRefresh }: PageProps) {
  const [reports, setReports] = useState<CellReport[]>([]);
  const [form, setForm] = useState({ attendanceCount: "", newVisitors: "", prayerPoints: "", challenges: "", dueDate: "" });
  const [approveComment, setApproveComment] = useState<Record<string, string>>({});
  const isDeptHead = departments.some((d) => d.headId === currentUser.id);

  const load = () => api<CellReport[]>("/reports/submissions").then(setReports).catch(() => {});

  useEffect(() => { load(); }, []);

  const reportType =
    isDeptHead && !["Cell Leader", "Sub-cell Leader", "Fellowship Leader"].includes(currentUser.role)
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
        departmentId: reportType === "department" ? departments.find((d) => d.headId === currentUser.id)?.id : null,
        period: `Week of ${new Date().toISOString().slice(0, 10)}`,
        attendanceCount: Number(form.attendanceCount) || 0,
        newVisitors: Number(form.newVisitors) || 0,
        prayerPoints: form.prayerPoints,
        challenges: form.challenges,
        dueDate: form.dueDate || undefined,
      }),
    });
    setForm({ attendanceCount: "", newVisitors: "", prayerPoints: "", challenges: "" });
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
    isDeptHead;

  return (
    <div className="space-y-6">
      <PageHeader title="Report Submissions" subtitle="Cell, fellowship, and department reports" />
      {canSubmit && (
        <Card>
          <h2 className="mb-4 font-semibold">Submit {reportType} report</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Attendance Count" value={form.attendanceCount} onChange={(v) => setForm((r) => ({ ...r, attendanceCount: v }))} />
            <Input label="New Visitors" value={form.newVisitors} onChange={(v) => setForm((r) => ({ ...r, newVisitors: v }))} />
            <Input label="Due date" type="date" value={form.dueDate} onChange={(v) => setForm((r) => ({ ...r, dueDate: v }))} />
            <Textarea label="Prayer Points" value={form.prayerPoints} onChange={(v) => setForm((r) => ({ ...r, prayerPoints: v }))} />
            <Textarea label="Challenges" value={form.challenges} onChange={(v) => setForm((r) => ({ ...r, challenges: v }))} />
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
              <p className="text-sm">Prayer: {r.prayerPoints}</p>
              <p className="text-sm">Challenges: {r.challenges}</p>
              {r.pastorComment && <p className="mt-2 text-sm text-[hsl(174,55%,42%)]">Pastor: {r.pastorComment}</p>}
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
