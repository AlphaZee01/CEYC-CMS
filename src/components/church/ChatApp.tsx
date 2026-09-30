import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  supabase,
  supabaseConfigured,
  memberChatChannel,
  syncSupabaseRealtimeAuth,
} from "@/lib/supabase";
import {
  loadActiveChatId,
  loadConversationCache,
  saveActiveChatId,
  saveConversationCache,
} from "@/lib/chat-cache";
import type { ChatMessage, Conversation } from "@/lib/chat-types";
import { cn, AvatarCircle } from "@/components/church/ui";
import { ChatListSkeleton, ChatThreadSkeleton } from "@/components/church/skeletons";
import { useOpenMenu } from "@/components/church/AppLayout";
import type { Member } from "@/types/church";

interface ChatAppProps {
  members: Member[];
  currentUser: Member;
}

function formatBubbleTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatListTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return formatBubbleTime(iso);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function dateSeparatorLabel(iso: string) {
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

type ThreadRow = { kind: "date"; label: string; key: string } | { kind: "msg"; message: ChatMessage };

function buildThreadRows(messages: ChatMessage[]): ThreadRow[] {
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

function MessageStatusIndicator({
  message,
  isMine,
  onPrimary,
}: {
  message: ChatMessage;
  isMine: boolean;
  onPrimary?: boolean;
}) {
  if (!isMine) return null;
  const tick = onPrimary ? "text-primary-foreground/65" : "text-muted-foreground";
  const tickRead = onPrimary ? "text-sky-200" : "text-sky-500";
  if (message.failed) {
    return <span className="text-[10px] font-medium text-red-400">Failed</span>;
  }
  if (message.pending) {
    return <Clock className={cn("h-3.5 w-3.5", tick)} aria-label="Sending" />;
  }
  if (message.recipientRead) {
    return <CheckCheck className={cn("h-3.5 w-3.5", tickRead)} aria-label="Read" />;
  }
  return <Check className={cn("h-3.5 w-3.5", tick)} aria-label="Sent" />;
}

export function ChatApp({ members, currentUser }: ChatAppProps) {
  const openMenu = useOpenMenu();
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    loadConversationCache(currentUser.id)
  );
  const [activeId, setActiveId] = useState<string | null>(() => loadActiveChatId(currentUser.id));
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  const canBroadcast = currentUser.role === "Senior Pastor" || currentUser.role === "Admin";

  const activeConvo = conversations.find((c) => c.id === activeId);
  const showThread = !!activeId;
  const isReadOnlyBroadcastThread = !!activeId?.startsWith("broadcast:");
  const showComposer = !isReadOnlyBroadcastThread;

  const scrollToBottom = useCallback(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadConversations = useCallback(
    (options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingList(true);
      return api<Conversation[]>("/messages/conversations")
        .then((list) => {
          setConversations(list);
          saveConversationCache(currentUser.id, list);
        })
        .catch((err) => {
          if (!options?.silent) {
            toast.error(err instanceof Error ? err.message : "Could not load conversations");
          }
        })
        .finally(() => {
          if (!options?.silent) setLoadingList(false);
        });
    },
    [currentUser.id]
  );

  const loadThread = useCallback(
    (partnerId: string, options?: { silent?: boolean }) => {
      if (!options?.silent) setLoadingThread(true);
      return api<ChatMessage[]>(`/messages/thread/${partnerId}`)
        .then((msgs) => {
          setMessages(msgs);
          msgs.filter((m) => !m.read && m.fromId !== currentUser.id).forEach((m) => {
            api(`/messages/${m.id}/read`, { method: "PATCH" }).catch(() => {});
          });
        })
        .catch((err) => {
          if (!options?.silent) {
            toast.error(err instanceof Error ? err.message : "Could not load messages");
            setMessages([]);
          }
        })
        .finally(() => {
          if (!options?.silent) setLoadingThread(false);
        });
    },
    [currentUser.id]
  );

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
    else setMessages([]);
  }, [activeId, loadThread]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!supabaseConfigured || !supabase) return;

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void syncSupabaseRealtimeAuth().then(() => {
      if (cancelled || !supabase) return;

      channel = supabase
        .channel(memberChatChannel(currentUser.id), { config: { broadcast: { self: true } } })
        .on("broadcast", { event: "new_message" }, ({ payload }) => {
          const msg = payload as ChatMessage;
          loadConversations({ silent: true });
          if (!activeId) return;
          const inThread =
            activeId === "__broadcast__" || activeId.startsWith("broadcast:")
              ? msg.broadcast
              : msg.broadcast
                ? false
                : msg.fromId === activeId ||
                  (msg.fromId === currentUser.id && msg.toIds.includes(activeId)) ||
                  (msg.fromId === activeId && msg.toIds.includes(currentUser.id));
          if (inThread) {
            setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
            if (msg.fromId !== currentUser.id) {
              api(`/messages/${msg.id}/read`, { method: "PATCH" }).catch(() => {});
            }
          }
        })
        .on("broadcast", { event: "message_read" }, ({ payload }) => {
          const { messageId } = payload as { messageId?: string };
          if (!messageId) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, recipientRead: true } : m))
          );
        })
        .subscribe((status, err) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.warn("[chat] Realtime subscribe failed:", status, err);
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [activeId, currentUser.id, loadConversations]);

  const contactableMembers = useMemo(
    () =>
      members
        .filter((m) => m.active && m.id !== currentUser.id)
        .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase())),
    [members, currentUser.id, search]
  );

  const threadRows = useMemo(() => buildThreadRows(messages), [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending || !activeId) return;
    if (activeId.startsWith("broadcast:")) {
      toast.error("Open Church Broadcast from the menu above to send a new announcement.");
      return;
    }
    setSending(true);
    const isBroadcast = activeId === "__broadcast__";
    const threadId = activeId;
    const pendingId = `pending-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: pendingId,
      fromId: currentUser.id,
      toIds: isBroadcast ? [] : [threadId],
      subject: "",
      body: text,
      sentAt: new Date().toISOString(),
      read: true,
      broadcast: isBroadcast,
      pending: true,
      recipientRead: false,
    };
    setMessages((prev) => [...prev, optimistic]);
    setDraft("");
    try {
      const sent = await api<{ id: string }>("/messages", {
        method: "POST",
        body: JSON.stringify({
          body: text,
          subject: "",
          broadcast: isBroadcast,
          toIds: isBroadcast ? undefined : [threadId],
        }),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === pendingId
            ? {
                ...m,
                id: sent.id,
                pending: false,
                failed: false,
                recipientRead: false,
              }
            : m
        )
      );
      await loadConversations({ silent: true });
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { ...m, pending: false, failed: true } : m))
      );
      toast.error(err instanceof Error ? err.message : "Message was not saved");
    } finally {
      setSending(false);
    }
  };

  const openChat = (id: string) => {
    setActiveId(id);
    saveActiveChatId(currentUser.id, id);
    setShowNewChat(false);
  };

  useEffect(() => {
    saveActiveChatId(currentUser.id, activeId);
  }, [activeId, currentUser.id]);

  const startNewChat = (memberId: string) => {
    const existing = conversations.find((c) => c.partnerId === memberId);
    openChat(existing?.id ?? memberId);
  };

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-muted/20 lg:rounded-2xl lg:border lg:border-border lg:shadow-sm">
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-border bg-card lg:w-[min(100%,22rem)] xl:w-96",
          showThread && "hidden lg:flex"
        )}
      >
        <div className="shrink-0 border-b border-border bg-card/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-md lg:pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {openMenu && (
                <button
                  type="button"
                  className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
                  onClick={openMenu}
                  aria-label="Open menu"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
              )}
              <h2 className="text-xl font-semibold tracking-tight text-foreground">Messages</h2>
            </div>
            <button
              type="button"
              onClick={() => setShowNewChat((v) => !v)}
              className={cn(
                "touch-target flex h-9 w-9 items-center justify-center rounded-full transition",
                showNewChat
                  ? "bg-muted text-foreground"
                  : "bg-primary text-primary-foreground shadow-sm shadow-primary/25 hover:opacity-90"
              )}
              aria-label={showNewChat ? "Close new chat" : "New chat"}
            >
              <Plus className={cn("h-5 w-5 transition", showNewChat && "rotate-45")} />
            </button>
          </div>
          <div className="relative mt-3">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people"
              className="w-full min-h-[40px] rounded-xl border border-border/60 bg-muted/40 py-2 pl-10 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showNewChat && (
            <ul className="max-h-52 overflow-y-auto border-b border-border bg-muted/30">
              {contactableMembers.length === 0 ? (
                <li className="px-4 py-4 text-sm text-muted-foreground">No people match your search.</li>
              ) : (
                contactableMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => startNewChat(m.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-card"
                    >
                      <AvatarCircle name={m.name} size="md" />
                      <span className="truncate text-sm font-medium">{m.name}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {canBroadcast && (
            <button
              type="button"
              onClick={() => openChat("__broadcast__")}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40",
                activeId === "__broadcast__" && "bg-primary/5"
              )}
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-foreground">Church Broadcast</p>
                <p className="truncate text-sm text-muted-foreground">Announcements for everyone</p>
              </div>
            </button>
          )}

          {loadingList && conversations.length === 0 ? (
            <ChatListSkeleton />
          ) : conversations.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-muted-foreground">
              No conversations yet. Tap <span className="font-medium text-primary">+</span> to start one.
            </p>
          ) : (
            <ul className="divide-y divide-border/70">
              {conversations.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openChat(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40",
                      activeId === c.id && "bg-primary/5"
                    )}
                  >
                    <AvatarCircle name={c.partnerName} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-foreground">{c.partnerName}</p>
                        <span
                          className={cn(
                            "shrink-0 text-xs tabular-nums",
                            c.unreadCount > 0 ? "font-semibold text-primary" : "text-muted-foreground"
                          )}
                        >
                          {formatListTime(c.lastAt)}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center justify-between gap-2">
                        <p className="truncate text-sm text-muted-foreground">
                          {c.lastMessage || "No messages yet"}
                        </p>
                        {c.unreadCount > 0 && (
                          <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
                            {c.unreadCount > 9 ? "9+" : c.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>

      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col bg-background",
          !showThread && "hidden lg:flex"
        )}
      >
        {!activeId ? (
          <div className="hidden flex-1 flex-col items-center justify-center gap-4 p-8 text-center lg:flex">
            <div className="rounded-2xl bg-primary/10 p-5">
              <MessageCircle className="h-10 w-10 text-primary" strokeWidth={1.5} />
            </div>
            <div className="max-w-sm space-y-1">
              <p className="text-lg font-semibold text-foreground">Your messages</p>
              <p className="text-sm text-muted-foreground">
                Pick a conversation from the list or start a new chat with someone in your church.
              </p>
            </div>
          </div>
        ) : (
          <>
            <header
              className="flex shrink-0 items-center gap-3 border-b border-border bg-card/90 px-3 py-2.5 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+0.35rem)] lg:pt-2.5"
            >
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activeId === "__broadcast__" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-600">
                  <Megaphone className="h-5 w-5" />
                </div>
              ) : (
                <AvatarCircle name={activeConvo?.partnerName || "?"} size="md" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-foreground">
                  {activeConvo?.partnerName || (activeId === "__broadcast__" ? "Church Broadcast" : "Chat")}
                </p>
                {(activeConvo?.partnerRole || activeId === "__broadcast__") && (
                  <p className="truncate text-xs text-muted-foreground">
                    {activeConvo?.partnerRole || "All members"}
                  </p>
                )}
              </div>
            </header>

            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/25 via-muted/10 to-background px-3 py-4 sm:px-5"
            >
              {loadingThread ? (
                <ChatThreadSkeleton />
              ) : messages.length === 0 ? (
                <p className="mx-auto max-w-xs rounded-2xl border border-border/60 bg-card px-4 py-3 text-center text-sm text-muted-foreground shadow-sm">
                  No messages here yet. Say hello.
                </p>
              ) : (
                <div className="mx-auto flex max-w-3xl flex-col gap-2">
                  {threadRows.map((row) => {
                    if (row.kind === "date") {
                      return (
                        <div key={row.key} className="flex justify-center py-1">
                          <span className="rounded-full bg-muted/80 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                            {row.label}
                          </span>
                        </div>
                      );
                    }
                    const m = row.message;
                    const mine = m.fromId === currentUser.id;
                    const sender = members.find((x) => x.id === m.fromId);
                    return (
                      <div key={m.id} className={cn("flex w-full", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "max-w-[min(88%,28rem)] rounded-2xl px-3.5 py-2 shadow-sm",
                            mine
                              ? "rounded-br-md bg-primary text-primary-foreground"
                              : "rounded-bl-md border border-border/50 bg-card text-foreground"
                          )}
                        >
                          {!mine && m.broadcast && (
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              Broadcast
                            </p>
                          )}
                          {!mine && activeId === "__broadcast__" && sender && (
                            <p className="mb-1 text-xs font-semibold text-primary">{sender.name}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                          <div
                            className={cn(
                              "mt-1 flex items-center justify-end gap-1 text-[10px] tabular-nums",
                              mine ? "text-primary-foreground/75" : "text-muted-foreground"
                            )}
                          >
                            <MessageStatusIndicator message={m} isMine={mine} onPrimary={mine} />
                            <span>{formatBubbleTime(m.sentAt)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showComposer ? (
              <footer className="shrink-0 border-t border-border bg-card/80 px-3 py-3 backdrop-blur-md lg:pb-safe">
                <form
                  className="mx-auto flex max-w-3xl items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <div className="flex min-h-[44px] flex-1 items-end rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
                    <textarea
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          send();
                        }
                      }}
                      rows={1}
                      placeholder="Message"
                      className="max-h-32 w-full resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md shadow-primary/20 transition hover:opacity-90 disabled:opacity-35"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </footer>
            ) : (
              <footer className="shrink-0 border-t border-border bg-muted/30 px-4 py-3 text-center text-xs text-muted-foreground lg:pb-safe">
                {canBroadcast
                  ? "Read-only thread. Send new announcements from Church Broadcast in the list."
                  : "You can read broadcast messages here but cannot reply in this thread."}
              </footer>
            )}
          </>
        )}
      </main>
    </div>
  );
}
