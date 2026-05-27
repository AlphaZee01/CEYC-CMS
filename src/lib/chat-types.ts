export type OutgoingMessageStatus = "sending" | "sent" | "read" | "failed";

export interface ChatMessage {
  id: string;
  fromId: string;
  toIds: string[];
  subject: string;
  body: string;
  sentAt: string;
  read: boolean;
  broadcast: boolean;
  /** Outgoing direct messages: whether the recipient has opened/read */
  recipientRead?: boolean;
  /** Optimistic UI while POST is in flight */
  pending?: boolean;
  failed?: boolean;
}

export interface Conversation {
  id: string;
  type: "direct" | "broadcast";
  partnerId: string | null;
  partnerName: string;
  partnerRole?: string;
  lastMessage: string;
  lastAt: string;
  unreadCount: number;
}
