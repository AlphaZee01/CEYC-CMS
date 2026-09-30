import { LayoutGrid, Megaphone, Plus, Search } from "lucide-react";
import type { Conversation } from "@/lib/chat-types";
import { AvatarCircle, cn } from "@/components/church/ui";
import { ChatListSkeleton } from "@/components/church/skeletons";
import { formatListTime } from "@/components/church/chat/chat-utils";
import type { Member } from "@/types/church";

type ConversationListProps = {
  currentUser: Member;
  conversations: Conversation[];
  activeId: string | null;
  loadingList: boolean;
  search: string;
  onSearchChange: (v: string) => void;
  showNewChat: boolean;
  onToggleNewChat: () => void;
  canBroadcast: boolean;
  contactableMembers: Member[];
  onOpenChat: (id: string) => void;
  onStartNewChat: (memberId: string) => void;
  onOpenMenu?: () => void;
  showThread: boolean;
};

export function ConversationList({
  currentUser,
  conversations,
  activeId,
  loadingList,
  search,
  onSearchChange,
  showNewChat,
  onToggleNewChat,
  canBroadcast,
  contactableMembers,
  onOpenChat,
  onStartNewChat,
  onOpenMenu,
  showThread,
}: ConversationListProps) {
  return (
    <aside
      className={cn(
        "flex w-full shrink-0 flex-col border-r border-border bg-card lg:w-[min(100%,22rem)] xl:w-96",
        showThread && "hidden lg:flex"
      )}
    >
      <div className="shrink-0 border-b border-border bg-card/90 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur-md lg:pt-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {onOpenMenu && (
              <button
                type="button"
                className="touch-target flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted lg:hidden"
                onClick={onOpenMenu}
                aria-label="Open menu"
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            )}
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Messages</h2>
          </div>
          <button
            type="button"
            onClick={onToggleNewChat}
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
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search people"
            className="w-full min-h-[40px] rounded-xl border border-border/60 bg-muted/40 py-2 pl-10 pr-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background focus:ring-2 focus:ring-primary/15"
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
                    onClick={() => onStartNewChat(m.id)}
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
            onClick={() => onOpenChat("__broadcast__")}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40",
              activeId === "__broadcast__" && "bg-primary/5"
            )}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600">
              <Megaphone className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">Church Broadcast</p>
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
                  onClick={() => onOpenChat(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-muted/40",
                    activeId === c.id && "bg-primary/5"
                  )}
                >
                  <AvatarCircle name={c.partnerName} size="md" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{c.partnerName}</p>
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
  );
}
