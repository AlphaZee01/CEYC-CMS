import type { ChatMessage } from "@/lib/chat-types";

export function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return formatBubbleTime(iso);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function dateSeparatorLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export type ThreadRow =
  | { kind: "date"; label: string; key: string }
  | { kind: "msg"; message: ChatMessage };

export function buildThreadRows(messages: ChatMessage[]): ThreadRow[] {
  const rows: ThreadRow[] = [];
  let lastDate = "";
  for (const m of messages) {
    const label = dateSeparatorLabel(m.sentAt);
    if (label !== lastDate) {
      rows.push({ kind: "date", label, key: `date-${label}-${m.sentAt}` });
      lastDate = label;
    }
    rows.push({ kind: "msg", message: m });
  }
  return rows;
}

export function messageInThread(
  msg: ChatMessage,
  activeId: string,
  currentUserId: string
): boolean {
  if (activeId === "__broadcast__" || activeId.startsWith("broadcast:")) {
    return msg.broadcast;
  }
  if (msg.broadcast) return false;
  return (
    msg.fromId === activeId ||
    (msg.fromId === currentUserId && msg.toIds.includes(activeId)) ||
    (msg.fromId === activeId && msg.toIds.includes(currentUserId))
  );
}
