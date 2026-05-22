import { useState, useMemo, useCallback, useEffect, type ReactNode } from "react";
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
  X,
  Bell,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Pin,
  Send,
  CheckCircle2,
  Circle,
  ChevronRight,
  LogOut,
  Shield,
  Eye,
  EyeOff,
  Upload,
  Play,
  Filter,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ───────────────────────────────────────────────────────────────────

type Role =
  | "Senior Pastor"
  | "Associate Pastor"
  | "Admin"
  | "Fellowship Leader"
  | "Cell Leader"
  | "Sub-cell Leader"
  | "Cell Member"
  | "Church Member";

type PageId =
  | "dashboard"
  | "members"
  | "cells"
  | "departments"
  | "attendance"
  | "events"
  | "reports"
  | "settings"
  | "communications"
  | "finances"
  | "prayer"
  | "discipleship"
  | "announcements"
  | "tasks"
  | "media"
  | "report-submissions";

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  cellId: string | null;
  fellowshipId: string | null;
  departmentIds: string[];
  active: boolean;
  joinedAt: string;
}

interface Fellowship {
  id: string;
  name: string;
  leaderId: string | null;
}

interface Cell {
  id: string;
  name: string;
  fellowshipId: string;
  leaderId: string | null;
  subLeaderId: string | null;
}

interface Department {
  id: string;
  name: string;
  headId: string | null;
  memberIds: string[];
}

interface AttendanceRecord {
  id: string;
  date: string;
  type: "cell" | "service";
  cellId: string | null;
  fellowshipId: string | null;
  presentIds: string[];
  absentIds: string[];
}

interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  departmentId: string | null;
  description: string;
  rsvpIds: string[];
}

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

interface FinanceRecord {
  id: string;
  date: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  memberId: string | null;
  description: string;
}

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

interface FollowUp {
  id: string;
  name: string;
  contact: string;
  stage: "Visitor" | "New Convert" | "Cell Member" | "Worker";
  assignedToId: string | null;
  notes: { date: string; text: string; outcome: string }[];
  createdAt: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  target: "all" | "fellowship" | "cell" | "department" | "role";
  targetId?: string;
  pinned: boolean;
  expiresAt: string;
  createdAt: string;
}

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

interface MediaItem {
  id: string;
  title: string;
  type: "audio" | "video" | "notes" | "slides";
  speaker: string;
  series: string;
  topic: string;
  date: string;
  url: string;
}

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

interface Activity {
  id: string;
  text: string;
  time: string;
}

interface ChurchSettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string;
}

interface AppState {
  members: Member[];
  fellowships: Fellowship[];
  cells: Cell[];
  departments: Department[];
  attendance: AttendanceRecord[];
  events: ChurchEvent[];
  messages: Message[];
  finances: FinanceRecord[];
  prayers: PrayerRequest[];
  followUps: FollowUp[];
  announcements: Announcement[];
  tasks: Task[];
  media: MediaItem[];
  reports: CellReport[];
  activities: Activity[];
  settings: ChurchSettings;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const ROLES: Role[] = [
  "Senior Pastor",
  "Associate Pastor",
  "Admin",
  "Fellowship Leader",
  "Cell Leader",
  "Sub-cell Leader",
  "Cell Member",
  "Church Member",
];

const DEPARTMENT_NAMES = [
  "Praise & Worship",
  "Ushering",
  "Children's Church (Loveworld Kids)",
  "Youth Ministry (CEYC)",
  "Prayer & Intercession",
  "Media & Technical",
  "Evangelism",
  "Protocol / Admin",
];

const CHART_COLORS = ["#5B21B6", "#0D9488", "#F97316", "#8B5CF6", "#14B8A6", "#FB7185"];

const PAGE_META: { id: PageId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "members", label: "Members", icon: Users },
  { id: "cells", label: "Cells & Fellowships", icon: Network },
  { id: "departments", label: "Ministry Departments", icon: Building2 },
  { id: "attendance", label: "Attendance", icon: ClipboardCheck },
  { id: "events", label: "Events", icon: Calendar },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "communications", label: "Communications", icon: MessageSquare },
  { id: "finances", label: "Finances", icon: Wallet },
  { id: "prayer", label: "Prayer Requests", icon: HeartHandshake },
  { id: "discipleship", label: "Discipleship", icon: UserPlus },
  { id: "announcements", label: "Announcements", icon: Megaphone },
  { id: "tasks", label: "Tasks", icon: ListTodo },
  { id: "media", label: "Media Library", icon: Film },
  { id: "report-submissions", label: "Report Submissions", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
];

const MEMBER_GROWTH = [
  { month: "Jan", members: 420 },
  { month: "Feb", members: 435 },
  { month: "Mar", members: 448 },
  { month: "Apr", members: 462 },
  { month: "May", members: 478 },
  { month: "Jun", members: 495 },
];

const ATTENDANCE_TREND = [
  { week: "W1", grace: 42, victory: 38, faith: 35 },
  { week: "W2", grace: 45, victory: 40, faith: 37 },
  { week: "W3", grace: 44, victory: 41, faith: 39 },
  { week: "W4", grace: 48, victory: 43, faith: 40 },
];

// ─── RBAC ──────────────────────────────────────────────────────────────────────

const PAGE_ACCESS: Record<Role, PageId[]> = {
  "Senior Pastor": PAGE_META.map((p) => p.id),
  "Associate Pastor": PAGE_META.map((p) => p.id).filter((id) => id !== "settings" && id !== "finances"),
  Admin: ["dashboard", "members", "attendance", "finances", "settings", "announcements", "tasks", "communications"],
  "Fellowship Leader": [
    "dashboard",
    "members",
    "cells",
    "attendance",
    "communications",
    "report-submissions",
    "announcements",
    "events",
  ],
  "Cell Leader": [
    "dashboard",
    "members",
    "attendance",
    "communications",
    "report-submissions",
    "announcements",
    "events",
    "prayer",
  ],
  "Sub-cell Leader": ["dashboard", "members", "attendance", "communications", "announcements", "events"],
  "Cell Member": ["dashboard", "communications", "prayer", "media", "announcements", "events"],
  "Church Member": ["dashboard", "communications", "prayer", "media", "announcements", "events"],
};

function canAccessPage(role: Role, page: PageId): boolean {
  return PAGE_ACCESS[role]?.includes(page) ?? false;
}

function isMemberRole(role: Role): boolean {
  return role === "Cell Member" || role === "Church Member";
}

function canAccessFinances(role: Role): boolean {
  return role === "Senior Pastor" || role === "Admin";
}

function canMessageTarget(sender: Member, target: Member): boolean {
  if (sender.id === target.id) return false;
  switch (sender.role) {
    case "Senior Pastor":
      return true;
    case "Associate Pastor":
      return target.role !== "Senior Pastor";
    case "Admin":
      return true;
    case "Fellowship Leader":
      return target.fellowshipId === sender.fellowshipId;
    case "Cell Leader":
    case "Sub-cell Leader":
      return target.cellId === sender.cellId;
    default:
      return (
        target.role === "Cell Leader" ||
        target.role === "Sub-cell Leader" ||
        target.role === "Senior Pastor" ||
        target.role === "Associate Pastor"
      );
  }
}

// ─── Initial mock data ─────────────────────────────────────────────────────────

function createInitialState(): AppState {
  const fellowships: Fellowship[] = [
    { id: "f1", name: "Grace Fellowship", leaderId: "m3" },
    { id: "f2", name: "Victory Fellowship", leaderId: "m8" },
  ];
  const cells: Cell[] = [
    { id: "c1", name: "Grace Cell A", fellowshipId: "f1", leaderId: "m4", subLeaderId: "m5" },
    { id: "c2", name: "Grace Cell B", fellowshipId: "f1", leaderId: "m6", subLeaderId: null },
    { id: "c3", name: "Victory Cell A", fellowshipId: "f2", leaderId: "m9", subLeaderId: null },
    { id: "c4", name: "Faith Cell", fellowshipId: "f1", leaderId: "m10", subLeaderId: null },
  ];
  const departments: Department[] = DEPARTMENT_NAMES.map((name, i) => ({
    id: `d${i + 1}`,
    name,
    headId: i === 0 ? "m2" : null,
    memberIds: [`m${11 + (i % 5)}`, `m${12 + (i % 4)}`].filter((_, idx) => 11 + (i % 5) + idx <= 20),
  }));
  const members: Member[] = [
    {
      id: "m1",
      name: "Rev. David Okonkwo",
      email: "pastor@celcm.org",
      phone: "+234 801 000 0001",
      role: "Senior Pastor",
      cellId: null,
      fellowshipId: null,
      departmentIds: [],
      active: true,
      joinedAt: "2018-01-15",
    },
    {
      id: "m2",
      name: "Pastor Grace Adeyemi",
      email: "grace@celcm.org",
      phone: "+234 801 000 0002",
      role: "Associate Pastor",
      cellId: null,
      fellowshipId: null,
      departmentIds: ["d1"],
      active: true,
      joinedAt: "2019-03-20",
    },
    {
      id: "m3",
      name: "Bro. Samuel Eze",
      email: "samuel@celcm.org",
      phone: "+234 801 000 0003",
      role: "Fellowship Leader",
      cellId: "c1",
      fellowshipId: "f1",
      departmentIds: ["d8"],
      active: true,
      joinedAt: "2020-06-10",
    },
    {
      id: "m4",
      name: "Sis. Chioma Nwosu",
      email: "chioma@celcm.org",
      phone: "+234 801 000 0004",
      role: "Cell Leader",
      cellId: "c1",
      fellowshipId: "f1",
      departmentIds: ["d1", "d5"],
      active: true,
      joinedAt: "2020-08-01",
    },
    {
      id: "m5",
      name: "Bro. Tunde Bakare",
      email: "tunde@celcm.org",
      phone: "+234 801 000 0005",
      role: "Sub-cell Leader",
      cellId: "c1",
      fellowshipId: "f1",
      departmentIds: ["d2"],
      active: true,
      joinedAt: "2021-01-12",
    },
    {
      id: "m6",
      name: "Sis. Amaka Okafor",
      email: "amaka@celcm.org",
      phone: "+234 801 000 0006",
      role: "Cell Leader",
      cellId: "c2",
      fellowshipId: "f1",
      departmentIds: ["d3"],
      active: true,
      joinedAt: "2021-02-18",
    },
    {
      id: "m7",
      name: "Mrs. Funke Admin",
      email: "admin@celcm.org",
      phone: "+234 801 000 0007",
      role: "Admin",
      cellId: null,
      fellowshipId: null,
      departmentIds: ["d8"],
      active: true,
      joinedAt: "2019-11-05",
    },
    {
      id: "m8",
      name: "Bro. James Musa",
      email: "james@celcm.org",
      phone: "+234 801 000 0008",
      role: "Fellowship Leader",
      cellId: "c3",
      fellowshipId: "f2",
      departmentIds: ["d4"],
      active: true,
      joinedAt: "2020-09-22",
    },
    {
      id: "m9",
      name: "Sis. Blessing Udo",
      email: "blessing@celcm.org",
      phone: "+234 801 000 0009",
      role: "Cell Leader",
      cellId: "c3",
      fellowshipId: "f2",
      departmentIds: ["d6"],
      active: true,
      joinedAt: "2021-04-30",
    },
    {
      id: "m10",
      name: "Bro. Emeka Ibe",
      email: "emeka@celcm.org",
      phone: "+234 801 000 0010",
      role: "Cell Leader",
      cellId: "c4",
      fellowshipId: "f1",
      departmentIds: ["d7"],
      active: true,
      joinedAt: "2021-06-15",
    },
    ...Array.from({ length: 15 }, (_, i) => ({
      id: `m${11 + i}`,
      name: `Member ${i + 1} Believer`,
      email: `member${i + 1}@celcm.org`,
      phone: `+234 802 000 ${1000 + i}`,
      role: (i % 3 === 0 ? "Cell Member" : "Church Member") as Role,
      cellId: ["c1", "c2", "c3", "c4"][i % 4],
      fellowshipId: i % 4 < 2 ? "f1" : "f2",
      departmentIds: [`d${(i % 8) + 1}`],
      active: true,
      joinedAt: `2022-${String((i % 12) + 1).padStart(2, "0")}-10`,
    })),
  ];

  return {
    members,
    fellowships,
    cells,
    departments,
    attendance: [
      {
        id: "a1",
        date: "2025-05-18",
        type: "cell",
        cellId: "c1",
        fellowshipId: "f1",
        presentIds: ["m4", "m5", "m11", "m12"],
        absentIds: ["m13"],
      },
      {
        id: "a2",
        date: "2025-05-19",
        type: "service",
        cellId: null,
        fellowshipId: null,
        presentIds: members.slice(0, 20).map((m) => m.id),
        absentIds: ["m20"],
      },
    ],
    events: [
      {
        id: "e1",
        title: "Sunday Service",
        date: "2025-05-25",
        time: "09:00",
        location: "Main Auditorium",
        departmentId: "d1",
        description: "Combined service with Praise & Worship",
        rsvpIds: ["m4", "m11", "m12"],
      },
      {
        id: "e2",
        title: "CEYC Outreach",
        date: "2025-06-01",
        time: "14:00",
        location: "Community Center",
        departmentId: "d4",
        description: "Youth evangelism outreach",
        rsvpIds: ["m8", "m15"],
      },
    ],
    messages: [
      {
        id: "msg1",
        fromId: "m1",
        toIds: ["m3", "m4", "m8"],
        subject: "Leaders Meeting Reminder",
        body: "Please attend the leaders briefing this Thursday at 6 PM.",
        sentAt: "2025-05-20T10:00:00",
        read: false,
        broadcast: false,
      },
      {
        id: "msg2",
        fromId: "m7",
        toIds: members.map((m) => m.id),
        subject: "Church Picnic Announcement",
        body: "All members are invited to the annual picnic on June 15.",
        sentAt: "2025-05-19T14:30:00",
        read: true,
        broadcast: true,
      },
    ],
    finances: [
      { id: "fin1", date: "2025-05-19", type: "income", category: "Tithe", amount: 450000, memberId: "m11", description: "Sunday tithes" },
      { id: "fin2", date: "2025-05-19", type: "income", category: "Offering", amount: 125000, memberId: null, description: "Sunday offering" },
      { id: "fin3", date: "2025-05-18", type: "income", category: "Seed", amount: 50000, memberId: "m4", description: "Building seed" },
      { id: "fin4", date: "2025-05-17", type: "expense", category: "Bills", amount: 85000, memberId: null, description: "Electricity" },
      { id: "fin5", date: "2025-05-15", type: "expense", category: "Outreach", amount: 120000, memberId: null, description: "Evangelism materials" },
    ],
    prayers: [
      {
        id: "pr1",
        memberId: "m11",
        title: "Healing for my mother",
        content: "Please pray for my mother who is in hospital.",
        isPrivate: false,
        status: "pending",
        createdAt: "2025-05-21",
      },
      {
        id: "pr2",
        memberId: "m12",
        title: "Job provision",
        content: "Trusting God for a new job opportunity.",
        isPrivate: true,
        status: "prayed",
        createdAt: "2025-05-18",
        response: "We prayed with you on Wednesday.",
      },
    ],
    followUps: [
      {
        id: "fu1",
        name: "John Visitor",
        contact: "+234 803 111 2222",
        stage: "Visitor",
        assignedToId: "m4",
        notes: [{ date: "2025-05-10", text: "First visit, welcomed warmly", outcome: "Positive" }],
        createdAt: "2025-05-10",
      },
      {
        id: "fu2",
        name: "Mary Convert",
        contact: "mary@email.com",
        stage: "New Convert",
        assignedToId: "m4",
        notes: [
          { date: "2025-05-12", text: "Foundation class started", outcome: "In progress" },
          { date: "2025-05-19", text: "Joined cell meeting", outcome: "Good" },
        ],
        createdAt: "2025-05-01",
      },
    ],
    announcements: [
      {
        id: "an1",
        title: "Water Baptism Class",
        content: "Register at the protocol desk for the upcoming baptism class.",
        target: "all",
        pinned: true,
        expiresAt: "2025-06-30",
        createdAt: "2025-05-15",
      },
      {
        id: "an2",
        title: "Grace Fellowship Prayer Night",
        content: "Friday 7 PM at Fellowship center.",
        target: "fellowship",
        targetId: "f1",
        pinned: false,
        expiresAt: "2025-05-30",
        createdAt: "2025-05-18",
      },
    ],
    tasks: [
      {
        id: "t1",
        title: "Prepare usher roster",
        description: "Create roster for June services",
        assigneeIds: ["m11", "m12"],
        departmentId: "d2",
        dueDate: "2025-05-28",
        priority: "high",
        status: "in_progress",
      },
      {
        id: "t2",
        title: "Update media equipment",
        description: "Check all cameras and sound",
        assigneeIds: ["m15"],
        departmentId: "d6",
        dueDate: "2025-06-05",
        priority: "medium",
        status: "pending",
      },
    ],
    media: [
      {
        id: "med1",
        title: "Walking in the Spirit",
        type: "video",
        speaker: "Rev. David Okonkwo",
        series: "Victory Series",
        topic: "Holy Spirit",
        date: "2025-05-12",
        url: "#sermon-1",
      },
      {
        id: "med2",
        title: "Faith Foundations Notes",
        type: "notes",
        speaker: "Pastor Grace Adeyemi",
        series: "Discipleship",
        topic: "Faith",
        date: "2025-05-05",
        url: "#notes-1",
      },
    ],
    reports: [
      {
        id: "r1",
        type: "cell",
        submitterId: "m4",
        cellId: "c1",
        period: "May Week 3",
        attendanceCount: 12,
        newVisitors: 2,
        prayerPoints: "Healing, jobs",
        challenges: "Venue capacity",
        status: "submitted",
        submittedAt: "2025-05-20",
      },
      {
        id: "r2",
        type: "fellowship",
        submitterId: "m3",
        fellowshipId: "f1",
        period: "May 2025",
        attendanceCount: 85,
        newVisitors: 8,
        prayerPoints: "Expansion",
        challenges: "Transport for outreach",
        status: "approved",
        pastorComment: "Excellent work. Plan outreach for June.",
        submittedAt: "2025-05-18",
      },
    ],
    activities: [
      { id: "act1", text: "Chioma Nwosu recorded cell attendance", time: "2 hours ago" },
      { id: "act2", text: "New member Member 3 Believer added to Grace Cell A", time: "5 hours ago" },
      { id: "act3", text: "Cell report submitted by Grace Cell A", time: "1 day ago" },
      { id: "act4", text: "Sunday offering recorded", time: "2 days ago" },
    ],
    settings: {
      name: "Christ Embassy Lagos Zone",
      tagline: "Raising a people of excellence",
      address: "12 Faith Avenue, Lagos, Nigeria",
      phone: "+234 1 234 5678",
      email: "info@celcm.org",
      logoUrl: "",
    },
  };
}

// ─── UI primitives ─────────────────────────────────────────────────────────────

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>{children}</div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  className,
  type = "button",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "accent" | "ghost" | "danger" | "highlight";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const styles = {
    primary: "bg-[hsl(262,52%,32%)] text-white hover:bg-[hsl(262,52%,28%)]",
    secondary: "bg-secondary text-secondary-foreground hover:opacity-90",
    accent: "bg-[hsl(174,55%,42%)] text-white hover:bg-[hsl(174,55%,36%)]",
    highlight: "bg-[hsl(12,85%,62%)] text-white hover:bg-[hsl(12,85%,55%)]",
    ghost: "bg-transparent hover:bg-muted text-foreground",
    danger: "bg-destructive text-white hover:opacity-90",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50",
        styles[variant],
        className
      )}
    >
      {children}
    </button>
  );
}

function Badge({ children, color = "purple", className }: { children: ReactNode; color?: "purple" | "teal" | "coral" | "gray"; className?: string }) {
  const colors = {
    purple: "bg-[hsl(262,52%,32%)]/10 text-[hsl(262,52%,32%)]",
    teal: "bg-[hsl(174,55%,42%)]/10 text-[hsl(174,50%,30%)]",
    coral: "bg-[hsl(12,85%,62%)]/10 text-[hsl(12,70%,45%)]",
    gray: "bg-muted text-muted-foreground",
  };
  return <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", colors[color], className)}>{children}</span>;
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  className,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      {label && <span className="mb-1 block text-sm font-medium text-foreground">{label}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-sm font-medium">{label}</span>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
      />
    </label>
  );
}

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-[hsl(262,52%,32%)]">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
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

function exportCSV(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function uid() {
  return Math.random().toString(36).slice(2, 11);
}

// ─── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [state, setState] = useState<AppState>(createInitialState);
  const [currentUserId, setCurrentUserId] = useState("m1");
  const [activePage, setActivePage] = useState<PageId>("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const currentUser = useMemo(
    () => state.members.find((m) => m.id === currentUserId) || state.members[0],
    [state.members, currentUserId]
  );

  const visiblePages = useMemo(
    () => PAGE_META.filter((p) => canAccessPage(currentUser.role, p.id)),
    [currentUser.role]
  );

  const scopedMembers = useCallback(() => {
    const { role, fellowshipId, cellId } = currentUser;
    if (role === "Fellowship Leader" && fellowshipId) {
      return state.members.filter((m) => m.fellowshipId === fellowshipId || m.id === currentUser.id);
    }
    if ((role === "Cell Leader" || role === "Sub-cell Leader") && cellId) {
      return state.members.filter((m) => m.cellId === cellId || m.id === currentUser.id);
    }
    if (isMemberRole(role)) {
      return state.members.filter((m) => m.id === currentUser.id);
    }
    return state.members;
  }, [state.members, currentUser]);

  const addActivity = (text: string) => {
    setState((s) => ({
      ...s,
      activities: [{ id: uid(), text, time: "Just now" }, ...s.activities.slice(0, 19)],
    }));
  };

  const navigate = (page: PageId) => {
    if (canAccessPage(currentUser.role, page)) {
      setActivePage(page);
      setSidebarOpen(false);
    }
  };

  const unreadCount = state.messages.filter(
    (m) => m.toIds.includes(currentUser.id) && !m.read && m.fromId !== currentUser.id
  ).length;

  const deptParticipation = state.departments.map((d) => ({
    name: d.name.split(" ")[0],
    value: d.memberIds.length + (d.headId ? 1 : 0),
  }));

  // Page: Dashboard
  const DashboardPage = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {currentUser.name}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Members" value={state.members.filter((m) => m.active).length} icon={Users} />
        <StatCard label="Cells" value={state.cells.length} icon={Network} accent="bg-[hsl(174,55%,42%)]" />
        <StatCard label="Fellowships" value={state.fellowships.length} icon={Building2} accent="bg-[hsl(12,85%,62%)]" />
        <StatCard label="Departments" value={state.departments.length} icon={Building2} />
      </div>
      <div className="flex flex-wrap gap-3">
        {canAccessPage(currentUser.role, "members") && (
          <Btn onClick={() => navigate("members")}>
            <Plus className="h-4 w-4" /> Add Member
          </Btn>
        )}
        {canAccessPage(currentUser.role, "attendance") && (
          <Btn variant="accent" onClick={() => navigate("attendance")}>
            <ClipboardCheck className="h-4 w-4" /> Record Attendance
          </Btn>
        )}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Recent Activity</h2>
          <ul className="space-y-3">
            {state.activities.map((a) => (
              <li key={a.id} className="flex gap-3 border-b border-border pb-3 last:border-0">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[hsl(174,55%,42%)]" />
                <div>
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Upcoming Events</h2>
          {state.events.slice(0, 3).map((e) => (
            <div key={e.id} className="mb-3 flex items-center justify-between rounded-lg bg-muted/50 p-3">
              <div>
                <p className="font-medium">{e.title}</p>
                <p className="text-xs text-muted-foreground">
                  {e.date} · {e.time}
                </p>
              </div>
              <Badge color="teal">{e.rsvpIds.length} RSVP</Badge>
            </div>
          ))}
        </Card>
      </div>
    </div>
  );

  // Members page state
  const [memberSearch, setMemberSearch] = useState("");
  const [memberFilterRole, setMemberFilterRole] = useState("");
  const [memberModal, setMemberModal] = useState<"add" | "edit" | null>(null);
  const [editMember, setEditMember] = useState<Partial<Member>>({});

  const MembersPage = () => {
    const filtered = scopedMembers().filter((m) => {
      const q = memberSearch.toLowerCase();
      const matchSearch =
        !q || m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q) || m.phone.includes(q);
      const matchRole = !memberFilterRole || m.role === memberFilterRole;
      return matchSearch && matchRole && (m.active || currentUser.role !== "Cell Member");
    });

    const saveMember = () => {
      if (!editMember.name || !editMember.email) return;
      if (memberModal === "add") {
        const newM: Member = {
          id: uid(),
          name: editMember.name!,
          email: editMember.email!,
          phone: editMember.phone || "",
          role: (editMember.role as Role) || "Church Member",
          cellId: editMember.cellId || null,
          fellowshipId: editMember.fellowshipId || null,
          departmentIds: editMember.departmentIds || [],
          active: true,
          joinedAt: new Date().toISOString().slice(0, 10),
        };
        setState((s) => ({ ...s, members: [...s.members, newM] }));
        addActivity(`${newM.name} was added to the directory`);
      } else if (editMember.id) {
        setState((s) => ({
          ...s,
          members: s.members.map((m) => (m.id === editMember.id ? { ...m, ...editMember } as Member : m)),
        }));
        addActivity(`${editMember.name} profile updated`);
      }
      setMemberModal(null);
      setEditMember({});
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Members</h1>
            <p className="text-muted-foreground">Directory & role management</p>
          </div>
          {!isMemberRole(currentUser.role) && (
            <Btn
              onClick={() => {
                setEditMember({ role: "Church Member", active: true });
                setMemberModal("add");
              }}
            >
              <Plus className="h-4 w-4" /> Add Member
            </Btn>
          )}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-lg border border-input py-2 pl-10 pr-3 text-sm"
            />
          </div>
          <select
            value={memberFilterRole}
            onChange={(e) => setMemberFilterRole(e.target.value)}
            className="rounded-lg border border-input px-3 py-2 text-sm"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Cell</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Department</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color="purple">{m.role}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {state.cells.find((c) => c.id === m.cellId)?.name || "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {m.departmentIds
                      .map((id) => state.departments.find((d) => d.id === id)?.name.split(" ")[0])
                      .join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!isMemberRole(currentUser.role) && (
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded p-1 hover:bg-muted"
                          onClick={() => {
                            setEditMember(m);
                            setMemberModal("edit");
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          className="rounded p-1 hover:bg-muted text-destructive"
                          onClick={() => {
                            setState((s) => ({
                              ...s,
                              members: s.members.map((x) => (x.id === m.id ? { ...x, active: false } : x)),
                            }));
                            addActivity(`${m.name} deactivated`);
                          }}
                        >
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
        <Modal open={!!memberModal} onClose={() => setMemberModal(null)} title={memberModal === "add" ? "Add Member" : "Edit Member"}>
          <div className="space-y-3">
            <Input label="Full Name" value={editMember.name || ""} onChange={(v) => setEditMember((e) => ({ ...e, name: v }))} />
            <Input label="Email" value={editMember.email || ""} onChange={(v) => setEditMember((e) => ({ ...e, email: v }))} />
            <Input label="Phone" value={editMember.phone || ""} onChange={(v) => setEditMember((e) => ({ ...e, phone: v }))} />
            <Select
              label="Role"
              value={editMember.role || "Church Member"}
              onChange={(v) => setEditMember((e) => ({ ...e, role: v as Role }))}
              options={ROLES.map((r) => ({ value: r, label: r }))}
            />
            <Select
              label="Cell"
              value={editMember.cellId || ""}
              onChange={(v) => setEditMember((e) => ({ ...e, cellId: v || null }))}
              options={[{ value: "", label: "None" }, ...state.cells.map((c) => ({ value: c.id, label: c.name }))]}
            />
            <div className="flex justify-end gap-2 pt-2">
              <Btn variant="ghost" onClick={() => setMemberModal(null)}>
                Cancel
              </Btn>
              <Btn onClick={saveMember}>Save</Btn>
            </div>
          </div>
        </Modal>
      </div>
    );
  };

  const [selectedCell, setSelectedCell] = useState(state.cells[0]?.id || "");
  const [attDate, setAttDate] = useState(new Date().toISOString().slice(0, 10));
  const [attCell, setAttCell] = useState(state.cells[0]?.id || "");
  const [attPresent, setAttPresent] = useState<Set<string>>(new Set());
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeTarget, setComposeTarget] = useState("");
  const [inboxTab, setInboxTab] = useState<"inbox" | "sent">("inbox");
  const [finForm, setFinForm] = useState({ type: "income" as "income" | "expense", category: "Tithe", amount: "", description: "" });
  const [prayerForm, setPrayerForm] = useState({ title: "", content: "", isPrivate: false });
  const [eventModal, setEventModal] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: "", date: "", time: "", location: "", description: "" });
  const [reportForm, setReportForm] = useState({ attendanceCount: "", newVisitors: "", prayerPoints: "", challenges: "" });

  const CellsPage = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Cells & Fellowships</h1>
          <p className="text-muted-foreground">Manage structure and leadership</p>
        </div>
        {!isMemberRole(currentUser.role) && currentUser.role !== "Cell Leader" && (
          <Btn onClick={() => {
            const id = uid();
            setState((s) => ({ ...s, cells: [...s.cells, { id, name: `New Cell ${s.cells.length + 1}`, fellowshipId: "f1", leaderId: null, subLeaderId: null }] }));
            addActivity("New cell created");
          }}><Plus className="h-4 w-4" /> New Cell</Btn>
        )}
      </div>
      {state.fellowships.map((f) => (
        <Card key={f.id}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-[hsl(262,52%,32%)]">{f.name}</h2>
              <p className="text-sm text-muted-foreground">
                Leader: {state.members.find((m) => m.id === f.leaderId)?.name || "Unassigned"}
              </p>
            </div>
            <Badge color="teal">{state.cells.filter((c) => c.fellowshipId === f.id).length} cells</Badge>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.cells.filter((c) => c.fellowshipId === f.id).map((c) => {
              const cellMembers = state.members.filter((m) => m.cellId === c.id && m.active);
              return (
                <div key={c.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{c.name}</h3>
                    <button onClick={() => setSelectedCell(c.id)} className="text-[hsl(174,55%,42%)]"><ChevronRight className="h-4 w-4" /></button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Leader: {state.members.find((m) => m.id === c.leaderId)?.name || "—"} · {cellMembers.length} members
                  </p>
                  {selectedCell === c.id && (
                    <ul className="mt-3 space-y-1 border-t pt-2 text-sm">
                      {cellMembers.map((m) => (
                        <li key={m.id} className="flex justify-between">
                          <span>{m.name}</span>
                          <Badge color="gray">{m.role}</Badge>
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
    </div>
  );

  const DepartmentsPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Ministry Departments</h1>
      <div className="grid gap-4 md:grid-cols-2">
        {state.departments.map((d) => (
          <Card key={d.id}>
            <h3 className="font-semibold">{d.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Head: {state.members.find((m) => m.id === d.headId)?.name || "Unassigned"}
            </p>
            <p className="mt-2 text-sm">{d.memberIds.length + (d.headId ? 1 : 0)} serving members</p>
            <ul className="mt-3 space-y-1 text-sm">
              {d.memberIds.slice(0, 5).map((mid) => (
                <li key={mid}>{state.members.find((m) => m.id === mid)?.name}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </div>
  );

  const AttendancePage = () => {
    const cellMembers = state.members.filter((m) => m.cellId === attCell && m.active);
    const saveAttendance = () => {
      const present = [...attPresent];
      const absent = cellMembers.map((m) => m.id).filter((id) => !present.includes(id));
      setState((s) => ({
        ...s,
        attendance: [
          {
            id: uid(),
            date: attDate,
            type: "cell",
            cellId: attCell,
            fellowshipId: state.cells.find((c) => c.id === attCell)?.fellowshipId || null,
            presentIds: present,
            absentIds: absent,
          },
          ...s.attendance,
        ],
      }));
      addActivity(`Attendance recorded for ${state.cells.find((c) => c.id === attCell)?.name}`);
      setAttPresent(new Set());
    };
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Attendance</h1>
        <Card>
          <h2 className="mb-4 font-semibold">Record Attendance</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Date" type="date" value={attDate} onChange={setAttDate} />
            <Select label="Cell" value={attCell} onChange={setAttCell} options={state.cells.map((c) => ({ value: c.id, label: c.name }))} />
          </div>
          <div className="mt-4 space-y-2">
            {cellMembers.map((m) => (
              <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <input
                  type="checkbox"
                  checked={attPresent.has(m.id)}
                  onChange={() => {
                    const next = new Set(attPresent);
                    if (next.has(m.id)) next.delete(m.id);
                    else next.add(m.id);
                    setAttPresent(next);
                  }}
                />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
          <Btn className="mt-4" onClick={saveAttendance}>Save Attendance</Btn>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">History</h2>
          {state.attendance.map((a) => (
            <div key={a.id} className="mb-3 flex justify-between border-b pb-3 text-sm last:border-0">
              <span>{a.date} — {a.type === "cell" ? state.cells.find((c) => c.id === a.cellId)?.name : "Service"}</span>
              <Badge color="teal">{a.presentIds.length} present</Badge>
            </div>
          ))}
        </Card>
      </div>
    );
  };

  const EventsPage = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Events</h1>
        <Btn onClick={() => setEventModal(true)}><Plus className="h-4 w-4" /> New Event</Btn>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-semibold">Calendar</h2>
          {state.events.sort((a, b) => a.date.localeCompare(b.date)).map((e) => (
            <div key={e.id} className="mb-2 rounded-lg bg-[hsl(262,52%,32%)]/5 p-3 text-sm">
              <p className="font-medium">{e.date}</p>
              <p>{e.title}</p>
            </div>
          ))}
        </Card>
        <div className="space-y-4 lg:col-span-2">
          {state.events.map((e) => (
            <Card key={e.id}>
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <h3 className="font-semibold">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">{e.date} at {e.time} · {e.location}</p>
                  <p className="mt-2 text-sm">{e.description}</p>
                </div>
                <Btn
                  variant={e.rsvpIds.includes(currentUser.id) ? "secondary" : "accent"}
                  onClick={() => {
                    setState((s) => ({
                      ...s,
                      events: s.events.map((ev) =>
                        ev.id === e.id
                          ? {
                              ...ev,
                              rsvpIds: ev.rsvpIds.includes(currentUser.id)
                                ? ev.rsvpIds.filter((id) => id !== currentUser.id)
                                : [...ev.rsvpIds, currentUser.id],
                            }
                          : ev
                      ),
                    }));
                  }}
                >
                  {e.rsvpIds.includes(currentUser.id) ? "Cancel RSVP" : "RSVP"}
                </Btn>
              </div>
            </Card>
          ))}
        </div>
      </div>
      <Modal open={eventModal} onClose={() => setEventModal(false)} title="Create Event">
        <div className="space-y-3">
          <Input label="Title" value={newEvent.title} onChange={(v) => setNewEvent((e) => ({ ...e, title: v }))} />
          <Input label="Date" type="date" value={newEvent.date} onChange={(v) => setNewEvent((e) => ({ ...e, date: v }))} />
          <Input label="Time" value={newEvent.time} onChange={(v) => setNewEvent((e) => ({ ...e, time: v }))} />
          <Input label="Location" value={newEvent.location} onChange={(v) => setNewEvent((e) => ({ ...e, location: v }))} />
          <Textarea label="Description" value={newEvent.description} onChange={(v) => setNewEvent((e) => ({ ...e, description: v }))} />
          <Btn onClick={() => {
            setState((s) => ({ ...s, events: [...s.events, { id: uid(), ...newEvent, departmentId: null, rsvpIds: [] }] }));
            setEventModal(false);
            setNewEvent({ title: "", date: "", time: "", location: "", description: "" });
            addActivity(`Event "${newEvent.title}" created`);
          }}>Create</Btn>
        </div>
      </Modal>
    </div>
  );

  const ReportsPage = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Reports & Analytics</h1>
        <Btn variant="accent" onClick={() => exportCSV("church-report.csv", ["Metric", "Value"], [["Members", String(state.members.length)], ["Cells", String(state.cells.length)]])}>
          <Download className="h-4 w-4" /> Export CSV
        </Btn>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-semibold">Member Growth</h2>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MEMBER_GROWTH}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="members" stroke="#5B21B6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h2 className="mb-4 font-semibold">Attendance by Cell</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ATTENDANCE_TREND}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="grace" fill="#5B21B6" name="Grace A" />
              <Bar dataKey="victory" fill="#0D9488" name="Victory A" />
              <Bar dataKey="faith" fill="#F97316" name="Faith" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="lg:col-span-2">
          <h2 className="mb-4 font-semibold">Department Participation</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={deptParticipation} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                {deptParticipation.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );

  const SettingsPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Settings</h1>
      <Card>
        <h2 className="mb-4 font-semibold">Church Information</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Church Name" value={state.settings.name} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, name: v } }))} />
          <Input label="Tagline" value={state.settings.tagline} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, tagline: v } }))} />
          <Input label="Address" value={state.settings.address} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, address: v } }))} />
          <Input label="Phone" value={state.settings.phone} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, phone: v } }))} />
          <Input label="Email" value={state.settings.email} onChange={(v) => setState((s) => ({ ...s, settings: { ...s.settings, email: v } }))} />
        </div>
      </Card>
      <Card>
        <h2 className="mb-2 font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Demo Role Switcher</h2>
        <p className="mb-4 text-sm text-muted-foreground">Switch roles to preview access control for different users.</p>
        <Select
          label="Simulate user"
          value={currentUserId}
          onChange={(v) => {
            setCurrentUserId(v);
            const user = state.members.find((m) => m.id === v);
            if (user) {
              const firstPage = PAGE_META.find((p) => canAccessPage(user.role, p.id));
              if (firstPage) setActivePage(firstPage.id);
            }
          }}
          options={state.members.filter((m) => m.active).map((m) => ({ value: m.id, label: `${m.name} (${m.role})` }))}
        />
      </Card>
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

  const CommunicationsPage = () => {
    const targets = state.members.filter((m) => m.active && m.id !== currentUser.id && canMessageTarget(currentUser, m));
    const inbox = state.messages.filter((m) => m.toIds.includes(currentUser.id) || m.fromId === currentUser.id);
    const sendMessage = () => {
      if (!composeSubject || !composeBody) return;
      const toIds = composeTarget === "broadcast" ? state.members.map((m) => m.id) : composeTarget ? [composeTarget] : [];
      if (!toIds.length) return;
      setState((s) => ({
        ...s,
        messages: [
          {
            id: uid(),
            fromId: currentUser.id,
            toIds,
            subject: composeSubject,
            body: composeBody,
            sentAt: new Date().toISOString(),
            read: false,
            broadcast: composeTarget === "broadcast",
          },
          ...s.messages,
        ],
      }));
      setComposeSubject("");
      setComposeBody("");
      setComposeTarget("");
      addActivity("Message sent");
    };
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Communications</h1>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-semibold">Compose</h2>
            <div className="space-y-3">
              <Select
                label="Recipient"
                value={composeTarget}
                onChange={setComposeTarget}
                options={[
                  { value: "", label: "Select recipient..." },
                  ...(currentUser.role === "Senior Pastor" || currentUser.role === "Admin"
                    ? [{ value: "broadcast", label: "Broadcast — All Members" }]
                    : []),
                  ...targets.map((m) => ({ value: m.id, label: `${m.name} (${m.role})` })),
                ]}
              />
              <Input label="Subject" value={composeSubject} onChange={setComposeSubject} />
              <Textarea label="Message" value={composeBody} onChange={setComposeBody} rows={5} />
              <Btn onClick={sendMessage}><Send className="h-4 w-4" /> Send</Btn>
            </div>
          </Card>
          <Card>
            <div className="mb-4 flex gap-2">
              <button onClick={() => setInboxTab("inbox")} className={cn("rounded-lg px-3 py-1 text-sm", inboxTab === "inbox" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>Inbox</button>
              <button onClick={() => setInboxTab("sent")} className={cn("rounded-lg px-3 py-1 text-sm", inboxTab === "sent" ? "bg-[hsl(262,52%,32%)] text-white" : "bg-muted")}>Sent</button>
            </div>
            {inbox
              .filter((m) => (inboxTab === "inbox" ? m.toIds.includes(currentUser.id) : m.fromId === currentUser.id))
              .map((m) => (
                <div key={m.id} className="mb-3 rounded-lg border p-3 text-sm">
                  <p className="font-medium">{m.subject} {m.broadcast && <Badge color="coral">Broadcast</Badge>}</p>
                  <p className="text-xs text-muted-foreground">
                    {inboxTab === "inbox" ? `From: ${state.members.find((x) => x.id === m.fromId)?.name}` : "Sent"} · {new Date(m.sentAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2">{m.body}</p>
                </div>
              ))}
          </Card>
        </div>
      </div>
    );
  };

  const FinancesPage = () => {
    if (!canAccessFinances(currentUser.role)) {
      return <Card><p className="text-muted-foreground">You do not have access to finances.</p></Card>;
    }
    const income = state.finances.filter((f) => f.type === "income").reduce((s, f) => s + f.amount, 0);
    const expenses = state.finances.filter((f) => f.type === "expense").reduce((s, f) => s + f.amount, 0);
    return (
      <div className="space-y-6">
        <div className="flex justify-between">
          <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Finances</h1>
          <Btn variant="accent" onClick={() => exportCSV("finances.csv", ["Date", "Type", "Category", "Amount", "Description"], state.finances.map((f) => [f.date, f.type, f.category, String(f.amount), f.description]))}>
            <Download className="h-4 w-4" /> Export
          </Btn>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Income" value={`₦${income.toLocaleString()}`} icon={Wallet} />
          <StatCard label="Total Expenses" value={`₦${expenses.toLocaleString()}`} icon={Wallet} accent="bg-[hsl(12,85%,62%)]" />
          <StatCard label="Balance" value={`₦${(income - expenses).toLocaleString()}`} icon={Wallet} accent="bg-[hsl(174,55%,42%)]" />
        </div>
        <Card>
          <h2 className="mb-4 font-semibold">Record Transaction</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Type" value={finForm.type} onChange={(v) => setFinForm((f) => ({ ...f, type: v as "income" | "expense" }))} options={[{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }]} />
            <Select label="Category" value={finForm.category} onChange={(v) => setFinForm((f) => ({ ...f, category: v }))} options={["Tithe", "Offering", "Seed", "Project Fund", "Bills", "Outreach", "Events"].map((c) => ({ value: c, label: c }))} />
            <Input label="Amount (₦)" value={finForm.amount} onChange={(v) => setFinForm((f) => ({ ...f, amount: v }))} />
            <Input label="Description" value={finForm.description} onChange={(v) => setFinForm((f) => ({ ...f, description: v }))} />
          </div>
          <Btn className="mt-4" onClick={() => {
            if (!finForm.amount) return;
            setState((s) => ({ ...s, finances: [{ id: uid(), date: new Date().toISOString().slice(0, 10), type: finForm.type, category: finForm.category, amount: Number(finForm.amount), memberId: null, description: finForm.description }, ...s.finances] }));
            setFinForm({ type: "income", category: "Tithe", amount: "", description: "" });
            addActivity(`${finForm.type} recorded: ₦${finForm.amount}`);
          }}>Save</Btn>
        </Card>
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2">Type</th><th className="px-4 py-2">Category</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
            <tbody>
              {state.finances.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-2">{f.date}</td>
                  <td className="px-4 py-2"><Badge color={f.type === "income" ? "teal" : "coral"}>{f.type}</Badge></td>
                  <td className="px-4 py-2">{f.category}</td>
                  <td className="px-4 py-2 text-right font-medium">₦{f.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    );
  };

  const PrayerPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Prayer Requests</h1>
      <Card>
        <h2 className="mb-4 font-semibold">Submit Request</h2>
        <div className="space-y-3">
          <Input label="Title" value={prayerForm.title} onChange={(v) => setPrayerForm((p) => ({ ...p, title: v }))} />
          <Textarea label="Request" value={prayerForm.content} onChange={(v) => setPrayerForm((p) => ({ ...p, content: v }))} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={prayerForm.isPrivate} onChange={(e) => setPrayerForm((p) => ({ ...p, isPrivate: e.target.checked }))} />
            Private (visible to prayer team only)
          </label>
          <Btn onClick={() => {
            setState((s) => ({ ...s, prayers: [{ id: uid(), memberId: currentUser.id, title: prayerForm.title, content: prayerForm.content, isPrivate: prayerForm.isPrivate, status: "pending", createdAt: new Date().toISOString().slice(0, 10) }, ...s.prayers] }));
            setPrayerForm({ title: "", content: "", isPrivate: false });
          }}>Submit</Btn>
        </div>
      </Card>
      {state.prayers
        .filter((p) => !p.isPrivate || !isMemberRole(currentUser.role) || p.memberId === currentUser.id)
        .map((p) => (
          <Card key={p.id}>
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.title} {p.isPrivate ? <EyeOff className="inline h-4 w-4 text-muted-foreground" /> : <Eye className="inline h-4 w-4" />}</h3>
                <p className="text-sm text-muted-foreground">{state.members.find((m) => m.id === p.memberId)?.name} · {p.createdAt}</p>
                <p className="mt-2">{p.content}</p>
                {p.response && <p className="mt-2 text-sm text-[hsl(174,55%,42%)]">Response: {p.response}</p>}
              </div>
              {!isMemberRole(currentUser.role) && (
                <div className="flex gap-2">
                  <Btn variant="accent" onClick={() => setState((s) => ({ ...s, prayers: s.prayers.map((x) => x.id === p.id ? { ...x, status: "prayed" as const, response: "Prayed for in intercession." } : x) }))}>Mark Prayed</Btn>
                  <Btn onClick={() => setState((s) => ({ ...s, prayers: s.prayers.map((x) => x.id === p.id ? { ...x, status: "answered" as const } : x) }))}>Answered</Btn>
                </div>
              )}
            </div>
            <Badge color={p.status === "pending" ? "coral" : p.status === "prayed" ? "teal" : "purple"} className="mt-2">{p.status}</Badge>
          </Card>
        ))}
    </div>
  );

  const DiscipleshipPage = () => (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Discipleship & Follow-up</h1>
        <Btn onClick={() => setState((s) => ({ ...s, followUps: [...s.followUps, { id: uid(), name: "New Visitor", contact: "", stage: "Visitor", assignedToId: currentUser.id, notes: [], createdAt: new Date().toISOString().slice(0, 10) }] }))}><Plus className="h-4 w-4" /> Add</Btn>
      </div>
      {state.followUps.map((fu) => (
        <Card key={fu.id}>
          <div className="flex flex-wrap justify-between">
            <div>
              <h3 className="font-semibold">{fu.name}</h3>
              <p className="text-sm text-muted-foreground">{fu.contact}</p>
              <Badge color="purple" className="mt-2">{fu.stage}</Badge>
            </div>
            <Select
              value={fu.stage}
              onChange={(v) => setState((s) => ({ ...s, followUps: s.followUps.map((x) => x.id === fu.id ? { ...x, stage: v as FollowUp["stage"] } : x) }))}
              options={["Visitor", "New Convert", "Cell Member", "Worker"].map((s) => ({ value: s, label: s }))}
            />
          </div>
          {fu.notes.map((n, i) => (
            <p key={i} className="mt-2 text-sm border-l-2 border-[hsl(174,55%,42%)] pl-3">{n.date}: {n.text} — <em>{n.outcome}</em></p>
          ))}
        </Card>
      ))}
    </div>
  );

  const AnnouncementsPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Announcements</h1>
      {state.announcements.map((a) => (
        <Card key={a.id} className={a.pinned ? "border-[hsl(12,85%,62%)]" : ""}>
          <div className="flex gap-2">
            {a.pinned && <Pin className="h-4 w-4 text-[hsl(12,85%,62%)]" />}
            <h3 className="font-semibold">{a.title}</h3>
          </div>
          <p className="mt-2 text-sm">{a.content}</p>
          <p className="mt-2 text-xs text-muted-foreground">Expires: {a.expiresAt}</p>
        </Card>
      ))}
      {!isMemberRole(currentUser.role) && (
        <Btn onClick={() => setState((s) => ({ ...s, announcements: [{ id: uid(), title: "New Notice", content: "Update content here.", target: "all", pinned: false, expiresAt: "2025-12-31", createdAt: new Date().toISOString().slice(0, 10) }, ...s.announcements] }))}>
          <Plus className="h-4 w-4" /> Post Announcement
        </Btn>
      )}
    </div>
  );

  const TasksPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Tasks & Assignments</h1>
      {state.tasks.map((t) => (
        <Card key={t.id}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-sm text-muted-foreground">Due: {t.dueDate}</p>
              <p className="mt-1 text-sm">{t.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color={t.priority === "high" ? "coral" : t.priority === "medium" ? "teal" : "gray"}>{t.priority}</Badge>
              <button onClick={() => setState((s) => ({ ...s, tasks: s.tasks.map((x) => x.id === t.id ? { ...x, status: x.status === "completed" ? "pending" : "completed" } : x) }))}>
                {t.status === "completed" ? <CheckCircle2 className="h-5 w-5 text-[hsl(174,55%,42%)]" /> : <Circle className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  const MediaPage = () => (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
        <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Media Library</h1>
        {(currentUser.role === "Senior Pastor" || currentUser.role === "Admin") && (
          <Btn><Upload className="h-4 w-4" /> Upload</Btn>
        )}
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input placeholder="Search sermons..." className="w-full rounded-lg border py-2 pl-10 pr-3 text-sm" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {state.media.map((m) => (
          <Card key={m.id}>
            <div className="flex gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[hsl(262,52%,32%)]/10">
                {m.type === "video" ? <Play className="h-6 w-6 text-[hsl(262,52%,32%)]" /> : <FileText className="h-6 w-6" />}
              </div>
              <div>
                <h3 className="font-semibold">{m.title}</h3>
                <p className="text-sm text-muted-foreground">{m.speaker} · {m.series}</p>
                <p className="text-xs text-muted-foreground">{m.date} · {m.topic}</p>
                <Btn variant="ghost" className="mt-2 !px-0"><Download className="h-4 w-4" /> Download</Btn>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  const ReportSubmissionsPage = () => (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[hsl(262,52%,32%)]">Report Submissions</h1>
      {(currentUser.role === "Cell Leader" || currentUser.role === "Fellowship Leader") && (
        <Card>
          <h2 className="mb-4 font-semibold">Submit Report</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Attendance Count" value={reportForm.attendanceCount} onChange={(v) => setReportForm((r) => ({ ...r, attendanceCount: v }))} />
            <Input label="New Visitors" value={reportForm.newVisitors} onChange={(v) => setReportForm((r) => ({ ...r, newVisitors: v }))} />
            <Textarea label="Prayer Points" value={reportForm.prayerPoints} onChange={(v) => setReportForm((r) => ({ ...r, prayerPoints: v }))} />
            <Textarea label="Challenges" value={reportForm.challenges} onChange={(v) => setReportForm((r) => ({ ...r, challenges: v }))} />
          </div>
          <Btn className="mt-4" onClick={() => {
            setState((s) => ({
              ...s,
              reports: [{
                id: uid(),
                type: currentUser.role === "Fellowship Leader" ? "fellowship" : "cell",
                submitterId: currentUser.id,
                cellId: currentUser.cellId || undefined,
                fellowshipId: currentUser.fellowshipId || undefined,
                period: `Week of ${new Date().toISOString().slice(0, 10)}`,
                attendanceCount: Number(reportForm.attendanceCount) || 0,
                newVisitors: Number(reportForm.newVisitors) || 0,
                prayerPoints: reportForm.prayerPoints,
                challenges: reportForm.challenges,
                status: "submitted",
                submittedAt: new Date().toISOString().slice(0, 10),
              }, ...s.reports],
            }));
            addActivity("Report submitted");
          }}>Submit Report</Btn>
        </Card>
      )}
      {state.reports.map((r) => (
        <Card key={r.id}>
          <div className="flex justify-between">
            <div>
              <h3 className="font-semibold capitalize">{r.type} Report — {r.period}</h3>
              <p className="text-sm text-muted-foreground">By {state.members.find((m) => m.id === r.submitterId)?.name}</p>
              <p className="mt-2 text-sm">Attendance: {r.attendanceCount} · Visitors: {r.newVisitors}</p>
              <p className="text-sm">Prayer: {r.prayerPoints}</p>
              <p className="text-sm">Challenges: {r.challenges}</p>
              {r.pastorComment && <p className="mt-2 text-sm text-[hsl(174,55%,42%)]">Pastor: {r.pastorComment}</p>}
            </div>
            <Badge color={r.status === "approved" ? "teal" : r.status === "overdue" ? "coral" : "purple"}>{r.status}</Badge>
          </div>
          {(currentUser.role === "Senior Pastor" || currentUser.role === "Associate Pastor") && r.status === "submitted" && (
            <Btn className="mt-3" variant="accent" onClick={() => setState((s) => ({ ...s, reports: s.reports.map((x) => x.id === r.id ? { ...x, status: "approved" as const, pastorComment: "Approved. Well done." } : x) }))}>Approve</Btn>
          )}
        </Card>
      ))}
    </div>
  );

  const renderPage = () => {
    switch (activePage) {
      case "dashboard": return <DashboardPage />;
      case "members": return <MembersPage />;
      case "cells": return <CellsPage />;
      case "departments": return <DepartmentsPage />;
      case "attendance": return <AttendancePage />;
      case "events": return <EventsPage />;
      case "reports": return <ReportsPage />;
      case "settings": return <SettingsPage />;
      case "communications": return <CommunicationsPage />;
      case "finances": return <FinancesPage />;
      case "prayer": return <PrayerPage />;
      case "discipleship": return <DiscipleshipPage />;
      case "announcements": return <AnnouncementsPage />;
      case "tasks": return <TasksPage />;
      case "media": return <MediaPage />;
      case "report-submissions": return <ReportSubmissionsPage />;
      default: return <DashboardPage />;
    }
  };

  useEffect(() => {
    if (!canAccessPage(currentUser.role, activePage)) {
      const fallback = visiblePages[0]?.id || "dashboard";
      setActivePage(fallback);
    }
  }, [currentUser.role, activePage, visiblePages]);

  return (
    <div className="flex min-h-screen bg-background">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] transition-transform lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex items-center gap-3 border-b border-[hsl(var(--sidebar-border))] p-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[hsl(var(--sidebar-primary))] font-bold text-white">CE</div>
          <div>
            <p className="font-semibold text-sm leading-tight">{state.settings.name.split(" ").slice(0, 2).join(" ")}</p>
            <p className="text-xs opacity-70">Church Management</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {visiblePages.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
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
          ))}
        </nav>
        <div className="border-t border-[hsl(var(--sidebar-border))] p-4 text-xs opacity-60">
          Christ Embassy LCM v1.0
        </div>
      </aside>

      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-card px-4 py-3 shadow-sm">
          <button className="lg:hidden rounded-lg p-2 hover:bg-muted" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1" />
          <div className="relative">
            <button className="relative rounded-lg p-2 hover:bg-muted" onClick={() => setNotificationsOpen(!notificationsOpen)}>
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[hsl(12,85%,62%)] text-[10px] text-white">{unreadCount}</span>
              )}
            </button>
            {notificationsOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl border bg-card p-3 shadow-lg">
                <p className="mb-2 text-sm font-semibold">Notifications</p>
                {state.tasks.filter((t) => t.assigneeIds.includes(currentUser.id) && t.status !== "completed").slice(0, 3).map((t) => (
                  <p key={t.id} className="text-xs py-1 border-b">Task due: {t.title}</p>
                ))}
                {state.reports.filter((r) => r.status === "overdue").map((r) => (
                  <p key={r.id} className="text-xs py-1 text-[hsl(12,85%,62%)]">Overdue report: {r.period}</p>
                ))}
                {unreadCount > 0 && <p className="text-xs py-1">{unreadCount} unread message(s)</p>}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{currentUser.name}</p>
              <Badge color="purple">{currentUser.role}</Badge>
            </div>
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[hsl(262,52%,32%)] text-sm font-medium text-white">
              {currentUser.name.charAt(0)}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">{renderPage()}</main>
      </div>
    </div>
  );
}
