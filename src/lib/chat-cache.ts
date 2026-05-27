import type { Conversation } from "@/lib/chat-types";

const CONVO_CACHE_PREFIX = "celcm_conversations_";
const ACTIVE_CHAT_PREFIX = "celcm_active_chat_";

export function loadConversationCache(memberId: string): Conversation[] {
  try {
    const raw = sessionStorage.getItem(`${CONVO_CACHE_PREFIX}${memberId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Conversation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveConversationCache(memberId: string, list: Conversation[]) {
  try {
    sessionStorage.setItem(`${CONVO_CACHE_PREFIX}${memberId}`, JSON.stringify(list));
  } catch {
    /* ignore quota */
  }
}

export function loadActiveChatId(memberId: string): string | null {
  try {
    return sessionStorage.getItem(`${ACTIVE_CHAT_PREFIX}${memberId}`);
  } catch {
    return null;
  }
}

export function saveActiveChatId(memberId: string, chatId: string | null) {
  try {
    const key = `${ACTIVE_CHAT_PREFIX}${memberId}`;
    if (chatId) sessionStorage.setItem(key, chatId);
    else sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}
