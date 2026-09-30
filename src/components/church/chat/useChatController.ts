import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import {
  loadActiveChatId,
  loadConversationCache,
  saveActiveChatId,
  saveConversationCache,
} from "@/lib/chat-cache";
import type { ChatMessage, Conversation } from "@/lib/chat-types";
import { useChatRealtime } from "@/hooks/useChatRealtime";
import type { Member } from "@/types/church";

export function useChatController(currentUser: Member) {
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
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;

  const canBroadcast = currentUser.role === "Senior Pastor" || currentUser.role === "Admin";

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
          msgs
            .filter((m) => !m.read && m.fromId !== currentUser.id)
            .forEach((m) => {
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

  const syncFromRealtime = useCallback(() => {
    void loadConversations({ silent: true });
    const id = activeIdRef.current;
    if (id) void loadThread(id, { silent: true });
  }, [loadConversations, loadThread]);

  const { realtimeStatus } = useChatRealtime(currentUser.id, syncFromRealtime);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeId) loadThread(activeId);
    else setMessages([]);
  }, [activeId, loadThread]);

  useEffect(() => {
    saveActiveChatId(currentUser.id, activeId);
  }, [activeId, currentUser.id]);

  const openChat = useCallback(
    (id: string) => {
      setActiveId(id);
      saveActiveChatId(currentUser.id, id);
      setShowNewChat(false);
    },
    [currentUser.id]
  );

  const startNewChat = useCallback(
    (memberId: string) => {
      const existing = conversations.find((c) => c.partnerId === memberId);
      openChat(existing?.id ?? memberId);
    },
    [conversations, openChat]
  );

  const send = useCallback(async () => {
    const text = draft.trim();
    const threadId = activeId;
    if (!text || sending || !threadId) return;
    if (threadId.startsWith("broadcast:")) {
      toast.error("Open Church Broadcast from the list to send a new announcement.");
      return;
    }

    setSending(true);
    const isBroadcast = threadId === "__broadcast__";
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
            ? { ...m, id: sent.id, pending: false, failed: false, recipientRead: false }
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
  }, [activeId, currentUser.id, draft, loadConversations, sending]);

  return {
    conversations,
    activeId,
    setActiveId,
    messages,
    draft,
    setDraft,
    search,
    setSearch,
    loadingList,
    loadingThread,
    sending,
    showNewChat,
    setShowNewChat,
    canBroadcast,
    realtimeStatus,
    loadConversations,
    openChat,
    startNewChat,
    send,
  };
}
