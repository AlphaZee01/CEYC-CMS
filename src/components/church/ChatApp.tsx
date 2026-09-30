import type { Member } from "@/types/church";
import { ChatPage } from "@/components/church/chat/ChatPage";

interface ChatAppProps {
  members: Member[];
  currentUser: Member;
}

/** Communications chat — modular UI with Supabase Realtime postgres_changes. */
export function ChatApp(props: ChatAppProps) {
  return <ChatPage {...props} />;
}
