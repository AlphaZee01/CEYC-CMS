import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ArrowLeft, Check, CheckCheck, Clock, LayoutGrid, Megaphone, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { supabase, supabaseConfigured, memberChatChannel } from "@/lib/supabase";
import {
  loadActiveChatId,
  loadConversationCache,
  saveActiveChatId,
  saveConversationCache,
} from "@/lib/chat-cache";
import type { ChatMessage, Conversation } from "@/lib/chat-types";
import { cn, AvatarCircle } from "@/components/church/ui";
import { ChatListSkeleton, ChatThreadSkeleton } from "@/components/church/skeletons";
import { ICON_TONES, toneFromString } from "@/lib/icon-colors";
import { useOpenMenu } from "@/components/church/AppLayout";
import type { Member } from "@/types/church";

interface ChatAppProps {
  members: Member[];
  currentUser: Member;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function MessageStatusIndicator({ message, isMine }: { message: ChatMessage; isMine: boolean }) {
  if (!isMine) {
    if (!message.read) {
      return <span className="text-[10px] font-medium text-highlight">New</span>;
    }
    return null;
  }
  if (message.failed) {
    return <span className="text-[10px] font-medium text-red-300">Failed</span>;
  }
  if (message.pending) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/70" title="Sending">
        <Clock className="h-3 w-3" />
        Sending
      </span>
    );
  }
  if (message.broadcast) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-white/70" title="Sent">
        <Check className="h-3 w-3" />
        Sent
      </span>
    );
  }
  if (message.recipientRead) {
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-sky-200" title="Read">
        <CheckCheck className="h-3.5 w-3.5" />
        Read
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-white/70" title="Delivered">
      <Check className="h-3 w-3" />
      Sent
    </span>
  );
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

    const channel = supabase
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeId, currentUser.id, loadConversations]);

  const contactableMembers = useMemo(
    () =>
      members
        .filter((m) => m.active && m.id !== currentUser.id)
        .filter((m) => !search || m.name.toLowerCase().includes(search.toLowerCase())),
    [members, currentUser.id, search]
  );

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
    <div className="flex h-full min-h-0 overflow-hidden bg-background lg:-mx-6 lg:rounded-xl lg:border lg:border-border">
      {/* Conversation list */}
      <aside
        className={cn(
          "flex w-full shrink-0 flex-col border-r bg-card lg:w-80 xl:w-96",
          showThread && "hidden lg:flex"
        )}
      >
        <div className="border-b border-white/10 bg-gradient-to-r from-[hsl(var(--sidebar-accent))] to-[hsl(var(--sidebar-primary))] px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] text-white lg:pt-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Messages</h2>
              <p className="text-xs text-white/70">Chat with your church family</p>
            </div>
            <div className="flex items-center gap-1.5">
              {openMenu && (
                <button
                  type="button"
                  className="touch-target flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 lg:hidden"
                  onClick={openMenu}
                  aria-label="Open full menu"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
              )}
              <AvatarCircle name={currentUser.name} size="sm" variant="solid" />
            </div>
          </div>
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search people..."
              className="w-full min-h-[42px] rounded-full border-0 bg-white py-2.5 pl-10 pr-4 text-sm text-foreground shadow-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-2 lg:pb-0">
          {canBroadcast && (
            <button
              type="button"
              onClick={() => openChat("__broadcast__")}
              className={cn(
                "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-muted/50",
                activeId === "__broadcast__" && "bg-orange-500/10"
              )}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-orange-600">
                <Megaphone className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium">Church Broadcast</p>
                <p className="truncate text-xs text-muted-foreground">Message all members</p>
              </div>
            </button>
          )}

          {loadingList && conversations.length === 0 ? (
            <ChatListSkeleton />
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet. Start a chat below.</p>
          ) : (
            conversations.map((c) => {
              const partnerTone = toneFromString(c.partnerName);
              const partnerStyle = ICON_TONES[partnerTone];
              return (
              <button
                key={c.id}
                type="button"
                onClick={() => openChat(c.id)}
                className={cn(
                  "flex w-full items-center gap-3 border-b px-4 py-3 text-left transition hover:bg-muted/50",
                  activeId === c.id && partnerStyle.soft,
                )}
              >
                <AvatarCircle name={c.partnerName} size="md" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{c.partnerName}</p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(c.lastAt)}</span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{c.lastMessage || "No messages yet"}</p>
                </div>
                {c.unreadCount > 0 && (
                  <span className={cn("flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white", partnerStyle.solid)}>
                    {c.unreadCount > 9 ? "9+" : c.unreadCount}
                  </span>
                )}
              </button>
            );
            })
          )}

          <div className="border-t p-3">
            <button
              type="button"
              onClick={() => setShowNewChat((v) => !v)}
              className="w-full rounded-lg bg-primary/10 py-2 text-sm font-medium text-primary"
            >
              {showNewChat ? "Hide contacts" : "New chat"}
            </button>
            {showNewChat && (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border">
                {contactableMembers.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => startNewChat(m.id)}
                      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                    >
                      <AvatarCircle name={m.name} size="sm" />
                      <span className="truncate">{m.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Thread */}
      <main className={cn("flex min-w-0 flex-1 flex-col bg-background", !showThread && "hidden lg:flex")}>
        {!activeId ? (
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-muted-foreground lg:flex">
            <p className="text-lg font-medium text-primary">Select a conversation</p>
            <p className="mt-1 text-sm">Tap a person below, or use <strong className="font-medium text-foreground">New chat</strong> to open a thread — then type at the bottom.</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-primary/10 bg-gradient-to-r from-[hsl(var(--sidebar-accent))] to-[hsl(var(--sidebar-primary))] px-3 py-3 text-white shadow-md pt-[calc(env(safe-area-inset-top)+0.5rem)] lg:pt-3">
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 lg:hidden"
                onClick={() => setActiveId(null)}
                aria-label="Back to chats"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {activeId === "__broadcast__" ? (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-500 text-white ring-2 ring-white/30">
                  <Megaphone className="h-5 w-5" />
                </div>
              ) : (
                <AvatarCircle name={activeConvo?.partnerName || "?"} size="md" variant="solid" className="ring-2 ring-white/30" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{activeConvo?.partnerName || "Chat"}</p>
                {activeConvo?.partnerRole ? (
                  <p className="truncate text-xs text-white/70">{activeConvo.partnerRole}</p>
                ) : activeId === "__broadcast__" ? (
                  <p className="truncate text-xs text-white/70">All church members</p>
                ) : (
                  <p className="truncate text-xs text-white/70">Direct message</p>
                )}
              </div>
              {openMenu && (
                <button
                  type="button"
                  className="touch-target flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 transition hover:bg-white/20 lg:hidden"
                  onClick={openMenu}
                  aria-label="Open full menu"
                >
                  <LayoutGrid className="h-5 w-5" />
                </button>
              )}
            </header>

            <div ref={messagesRef} className="flex-1 space-y-2 overflow-y-auto px-3 py-4">
              {loadingThread ? (
                <ChatThreadSkeleton />
              ) : messages.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">Say hello — send the first message.</p>
              ) : (
                messages.map((m) => {
                  const mine = m.fromId === currentUser.id;
                  const sender = members.find((x) => x.id === m.fromId);
                  return (
                    <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2 shadow-sm sm:max-w-[70%]",
                          mine
                            ? "rounded-br-md bg-primary text-white"
                            : "rounded-bl-md border bg-card text-foreground"
                        )}
                      >
                        {!mine && m.broadcast && (
                          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-highlight">
                            Broadcast
                          </p>
                        )}
                        {!mine && activeId === "__broadcast__" && sender && (
                          <p className={cn("mb-0.5 text-xs font-medium", mine ? "text-white/80" : "text-primary")}>
                            {sender.name}
                          </p>
                        )}
                        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{m.body}</p>
                        <p
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
                            mine ? "text-white/70" : "text-muted-foreground"
                          )}
                        >
                          <MessageStatusIndicator message={m} isMine={mine} />
                          <span>{formatTime(m.sentAt)}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {showComposer ? (
              <footer className="shrink-0 border-t bg-card p-3 lg:pb-safe">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    send();
                  }}
                >
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
                    placeholder="Type a message..."
                    className="max-h-28 min-h-[44px] flex-1 resize-none rounded-2xl border border-input bg-muted/30 px-4 py-2.5 text-base outline-none focus:ring-2 focus:ring-ring sm:text-sm"
                  />
                  <button
                    type="submit"
                    disabled={!draft.trim() || sending}
                    className="touch-target flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary text-white transition disabled:opacity-40"
                    aria-label="Send message"
                  >
                    <Send className="h-5 w-5" />
                  </button>
                </form>
              </footer>
            ) : (
              <footer className="shrink-0 border-t bg-muted/40 px-4 py-3 text-center text-xs text-muted-foreground lg:pb-safe">
                {canBroadcast
                  ? "View only. Use Church Broadcast above to send a new announcement."
                  : "You can read broadcast messages here but cannot reply in this thread."}
              </footer>
            )}
          </>
        )}
      </main>
    </div>
  );
}
