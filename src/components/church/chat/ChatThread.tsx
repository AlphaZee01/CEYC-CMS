import { useEffect, useMemo, useRef } from "react";
import { ArrowLeft, Megaphone, MessageCircle, Send } from "lucide-react";
import type { ChatMessage, Conversation } from "@/lib/chat-types";
import { AvatarCircle, cn } from "@/components/church/ui";
import { ChatThreadSkeleton } from "@/components/church/skeletons";
import { MessageBubble } from "@/components/church/chat/MessageBubble";
import { buildThreadRows } from "@/components/church/chat/chat-utils";
import type { Member } from "@/types/church";

type RealtimeStatus = "off" | "connecting" | "live" | "error";

type ChatThreadProps = {
  activeId: string;
  activeConvo: Conversation | undefined;
  messages: ChatMessage[];
  members: Member[];
  currentUser: Member;
  loadingThread: boolean;
  draft: string;
  onDraftChange: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  onBack: () => void;
  canBroadcast: boolean;
  realtimeStatus: RealtimeStatus;
};

export function ChatThread({
  activeId,
  activeConvo,
  messages,
  members,
  currentUser,
  loadingThread,
  draft,
  onDraftChange,
  sending,
  onSend,
  onBack,
  canBroadcast,
  realtimeStatus,
}: ChatThreadProps) {
  const messagesRef = useRef<HTMLDivElement>(null);
  const isReadOnlyBroadcastThread = activeId.startsWith("broadcast:");
  const showComposer = !isReadOnlyBroadcastThread;
  const threadRows = useMemo(() => buildThreadRows(messages), [messages]);

  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loadingThread]);

  const statusLabel =
    realtimeStatus === "live"
      ? "Live"
      : realtimeStatus === "connecting"
        ? "Connecting…"
        : realtimeStatus === "error"
          ? "Reconnecting…"
          : null;

  return (
    <>
      <header
        className="flex shrink-0 items-center gap-3 border-b border-border bg-card/90 px-3 py-2.5 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+0.35rem)] lg:pt-2.5"
      >
        <button
          type="button"
          className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
          onClick={onBack}
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
          <p className="truncate text-xs text-muted-foreground">
            {activeConvo?.partnerRole || (activeId === "__broadcast__" ? "All members" : statusLabel)}
            {activeConvo?.partnerRole && statusLabel ? ` · ${statusLabel}` : null}
            {!activeConvo?.partnerRole && activeId !== "__broadcast__" && statusLabel ? statusLabel : null}
          </p>
        </div>
        {statusLabel && activeId !== "__broadcast__" && (
          <span
            className={cn(
              "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide sm:inline",
              realtimeStatus === "live"
                ? "bg-emerald-500/15 text-emerald-700"
                : "bg-muted text-muted-foreground"
            )}
          >
            {statusLabel}
          </span>
        )}
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
                <MessageBubble
                  key={m.id}
                  message={m}
                  mine={mine}
                  senderName={sender?.name}
                  showSenderName={!mine && activeId === "__broadcast__" && !!sender}
                />
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
              onSend();
            }}
          >
            <div className="flex min-h-[44px] flex-1 items-end rounded-2xl border border-border/60 bg-muted/30 px-3 py-2 focus-within:border-primary/30 focus-within:ring-2 focus-within:ring-primary/10">
              <textarea
                value={draft}
                onChange={(e) => onDraftChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
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
  );
}

export function ChatEmptyState() {
  return (
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
  );
}
