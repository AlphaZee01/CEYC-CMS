import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  PenSquare,
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

/** WhatsApp-like palette (light). */
const WA = {
  header: "#008069",
  headerDark: "#075e54",
  panel: "#ffffff",
  listHover: "#f5f6f6",
  chatBg: "#efeae2",
  composer: "#f0f2f5",
  sentBubble: "#d9fdd3",
  meta: "#667781",
  tickRead: "#53bdeb",
  tickSent: "#8696a0",
  accent: "#25d366",
};

const CHAT_WALLPAPER =
  "url(\"data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23d4cdc4' fill-opacity='0.35'%3E%3Cpath d='M0 0h40v40H0V0zm40 40h40v40H40V40z'/%3E%3C/g%3E%3C/svg%3E\")";

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

function MessageStatusIndicator({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  if (!isMine) return null;
  if (message.failed) {
    return <span className="text-[11px] font-medium text-red-600">Failed</span>;
  }
  if (message.pending) {
    return <Clock className="h-[14px] w-[14px] text-[#8696a0]" aria-label="Sending" />;
  }
  if (message.recipientRead) {
    return <CheckCheck className="h-[14px] w-[14px] text-[#53bdeb]" aria-label="Read" />;
  }
  return <Check className="h-[14px] w-[14px] text-[#8696a0]" aria-label="Sent" />;
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
    <div
      className="flex h-full min-h-0 overflow-hidden lg:mx-0 lg:rounded-lg lg:border lg:border-[#d1d7db]"
      style={{ backgroundColor: WA.composer }}
    >
      {/* Chats list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r border-[#e9edef] bg-white lg:w-[30%] lg:min-w-[320px] lg:max-w-[420px]",
          showThread && "hidden lg:flex"
        )}
      >
        <div
          className="flex shrink-0 items-center justify-between gap-2 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+0.65rem)] text-white lg:pt-3"
          style={{ backgroundColor: WA.header }}
        >
          <div className="flex min-w-0 items-center gap-3">
            {openMenu && (
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
                onClick={openMenu}
                aria-label="Open menu"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            )}
            <AvatarCircle name={currentUser.name} size="sm" variant="solid" />
            <h2 className="text-lg font-medium tracking-tight">Chats</h2>
          </div>
          <button
            type="button"
            onClick={() => setShowNewChat((v) => !v)}
            className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10"
            aria-label={showNewChat ? "Close new chat" : "New chat"}
          >
            <PenSquare className="h-5 w-5" />
          </button>
        </div>

        <div className="shrink-0 border-b border-[#e9edef] bg-white px-3 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8696a0]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts"
              className="w-full min-h-[36px] rounded-lg bg-[#f0f2f5] py-2 pl-9 pr-3 text-sm text-[#111b21] outline-none placeholder:text-[#8696a0] focus:ring-1 focus:ring-[#008069]/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {showNewChat && (
            <ul className="max-h-56 overflow-y-auto border-b border-[#e9edef] bg-[#f0f2f5]">
              {contactableMembers.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[#667781]">No contacts match your search.</li>
              ) : (
                contactableMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => startNewChat(m.id)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white"
                    >
                      <AvatarCircle name={m.name} size="md" />
                      <span className="truncate text-[15px] text-[#111b21]">{m.name}</span>
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
                "flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#f5f6f6]",
                activeId === "__broadcast__" && "bg-[#f0f2f5]"
              )}
            >
              <div className="flex h-[49px] w-[49px] shrink-0 items-center justify-center rounded-full bg-[#25d366]/15 text-[#008069]">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1 border-b border-[#e9edef] pb-3">
                <p className="truncate text-[17px] text-[#111b21]">Church Broadcast</p>
                <p className="truncate text-sm text-[#667781]">Announcements to all members</p>
              </div>
            </button>
          )}

          {loadingList && conversations.length === 0 ? (
            <ChatListSkeleton />
          ) : conversations.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[#667781]">
              No chats yet. Tap <span className="font-medium text-[#008069]">New chat</span> to start.
            </p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openChat(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition hover:bg-[#f5f6f6]",
                  activeId === c.id && "bg-[#f0f2f5]"
                )}
              >
                <AvatarCircle name={c.partnerName} size="md" />
                <div className="min-w-0 flex-1 border-b border-[#e9edef] pb-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[17px] text-[#111b21]">{c.partnerName}</p>
                    <span
                      className={cn(
                        "shrink-0 text-xs",
                        c.unreadCount > 0 ? "font-medium text-[#25d366]" : "text-[#667781]"
                      )}
                    >
                      {formatListTime(c.lastAt)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-sm text-[#667781]">{c.lastMessage || "No messages yet"}</p>
                    {c.unreadCount > 0 && (
                      <span
                        className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-medium text-white"
                        style={{ backgroundColor: WA.accent }}
                      >
                        {c.unreadCount > 9 ? "9+" : c.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Thread */}
      <main
        className={cn(
          "flex min-w-0 flex-1 flex-col",
          !showThread && "hidden lg:flex",
          !activeId && "bg-[#f8f9fa]"
        )}
      >
        {!activeId ? (
          <div className="hidden flex-1 flex-col items-center justify-center border-b border-[#d1d7db] bg-[#f8f9fa] p-8 text-center lg:flex">
            <div
              className="mb-6 flex h-24 w-24 items-center justify-center rounded-full"
              style={{ backgroundColor: `${WA.header}18` }}
            >
              <MessageCircle className="h-12 w-12 text-[#008069]" strokeWidth={1.25} />
            </div>
            <p className="text-[32px] font-light text-[#41525d]">Church Chat</p>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-[#667781]">
              Send and receive messages with your church family. Select a chat on the left to open a conversation.
            </p>
          </div>
        ) : (
          <>
            <header
              className="flex shrink-0 items-center gap-2 px-2 py-2 text-white shadow-sm pt-[calc(env(safe-area-inset-top)+0.35rem)] lg:pt-2"
              style={{ backgroundColor: WA.header }}
            >
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-white/10 lg:hidden"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activeId === "__broadcast__" ? (
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20">
                  <Megaphone className="h-5 w-5" />
                </div>
              ) : (
                <AvatarCircle name={activeConvo?.partnerName || "?"} size="sm" variant="solid" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-medium leading-tight">
                  {activeConvo?.partnerName || (activeId === "__broadcast__" ? "Church Broadcast" : "Chat")}
                </p>
                <p className="truncate text-xs text-white/80">
                  {activeConvo?.partnerRole ||
                    (activeId === "__broadcast__" ? "All members" : "tap here for contact info")}
                </p>
              </div>
            </header>

            <div
              ref={messagesRef}
              className="flex-1 overflow-y-auto px-[4%] py-3 sm:px-[6%]"
              style={{ backgroundColor: WA.chatBg, backgroundImage: CHAT_WALLPAPER }}
            >
              {loadingThread ? (
                <ChatThreadSkeleton />
              ) : messages.length === 0 ? (
                <p className="rounded-lg bg-white/80 px-4 py-2 text-center text-sm text-[#667781] shadow-sm">
                  Messages are end-to-end organized for your church. Say hello.
                </p>
              ) : (
                <div className="space-y-1">
                  {threadRows.map((row) => {
                    if (row.kind === "date") {
                      return (
                        <div key={row.key} className="flex justify-center py-2">
                          <span className="rounded-lg bg-white/90 px-3 py-1 text-xs font-medium text-[#54656f] shadow-sm">
                            {row.label}
                          </span>
                        </div>
                      );
                    }
                    const m = row.message;
                    const mine = m.fromId === currentUser.id;
                    const sender = members.find((x) => x.id === m.fromId);
                    return (
                      <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                        <div
                          className={cn(
                            "relative max-w-[min(85%,28rem)] px-2 pb-1 pt-1.5 shadow-sm",
                            mine
                              ? "rounded-lg rounded-tr-none bg-[#d9fdd3] text-[#111b21]"
                              : "rounded-lg rounded-tl-none bg-white text-[#111b21]"
                          )}
                        >
                          {!mine && m.broadcast && (
                            <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-[#008069]">
                              Broadcast
                            </p>
                          )}
                          {!mine && activeId === "__broadcast__" && sender && (
                            <p className="mb-0.5 text-xs font-semibold text-[#008069]">{sender.name}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words pr-14 text-[14.2px] leading-[19px]">
                            {m.body}
                          </p>
                          <div
                            className="absolute bottom-1 right-2 flex items-center gap-0.5 text-[11px] text-[#667781]"
                          >
                            <span>{formatBubbleTime(m.sentAt)}</span>
                            <MessageStatusIndicator message={m} isMine={mine} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {showComposer ? (
              <footer className="shrink-0 px-2 py-2 lg:pb-safe" style={{ backgroundColor: WA.composer }}>
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
                  <div className="flex min-h-[42px] flex-1 items-end rounded-lg bg-white px-3 py-2 shadow-sm">
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
                      placeholder="Type a message"
                      className="max-h-28 w-full resize-none bg-transparent text-[15px] text-[#111b21] outline-none placeholder:text-[#8696a0]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="touch-target mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition disabled:opacity-40"
                    style={{ backgroundColor: WA.header }}
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </footer>
            ) : (
              <footer
                className="shrink-0 px-4 py-3 text-center text-xs text-[#667781] lg:pb-safe"
                style={{ backgroundColor: WA.composer }}
              >
                {canBroadcast
                  ? "View only. Use Church Broadcast in the chat list to send announcements."
                  : "You can read broadcast messages here but cannot reply in this thread."}
              </footer>
            )}
          </>
        )}
      </main>
    </div>
  );
}
