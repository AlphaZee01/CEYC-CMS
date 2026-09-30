import { useMemo } from "react";
import { cn } from "@/components/church/ui";
import { useOpenMenu } from "@/components/church/AppLayout";
import type { Member } from "@/types/church";
import { ConversationList } from "@/components/church/chat/ConversationList";
import { ChatEmptyState, ChatThread } from "@/components/church/chat/ChatThread";
import { useChatController } from "@/components/church/chat/useChatController";

export type ChatPageProps = {
  members: Member[];
  currentUser: Member;
};

export function ChatPage({ members, currentUser }: ChatPageProps) {
  const openMenu = useOpenMenu();
  const chat = useChatController(currentUser);

  const activeConvo = chat.conversations.find((c) => c.id === chat.activeId);
  const showThread = !!chat.activeId;

  const contactableMembers = useMemo(
    () =>
      members
        .filter((m) => m.active && m.id !== currentUser.id)
        .filter((m) => !chat.search || m.name.toLowerCase().includes(chat.search.toLowerCase())),
    [members, currentUser.id, chat.search]
  );

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-muted/20 lg:rounded-2xl lg:border lg:border-border lg:shadow-sm">
      <ConversationList
        currentUser={currentUser}
        conversations={chat.conversations}
        activeId={chat.activeId}
        loadingList={chat.loadingList}
        search={chat.search}
        onSearchChange={chat.setSearch}
        showNewChat={chat.showNewChat}
        onToggleNewChat={() => chat.setShowNewChat((v) => !v)}
        canBroadcast={chat.canBroadcast}
        contactableMembers={contactableMembers}
        onOpenChat={chat.openChat}
        onStartNewChat={chat.startNewChat}
        onOpenMenu={openMenu ?? undefined}
        showThread={showThread}
      />

      <main
        className={cn("flex min-w-0 flex-1 flex-col bg-background", !showThread && "hidden lg:flex")}
      >
        {!chat.activeId ? (
          <ChatEmptyState />
        ) : (
          <ChatThread
            activeId={chat.activeId}
            activeConvo={activeConvo}
            messages={chat.messages}
            members={members}
            currentUser={currentUser}
            loadingThread={chat.loadingThread}
            draft={chat.draft}
            onDraftChange={chat.setDraft}
            sending={chat.sending}
            onSend={chat.send}
            onBack={() => chat.setActiveId(null)}
            canBroadcast={chat.canBroadcast}
            realtimeStatus={chat.realtimeStatus}
          />
        )}
      </main>
    </div>
  );
}
