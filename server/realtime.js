import { createClient } from "@supabase/supabase-js";

let client;

function getClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  if (!client) client = createClient(url, key);
  return client;
}

/** Push new message to member Realtime channels (Supabase Broadcast). */
export async function broadcastChatMessage(message, memberIds) {
  const sb = getClient();
  if (!sb) return;

  const ids = new Set(memberIds.filter(Boolean));
  if (message.fromId) ids.add(message.fromId);

  await Promise.all(
    [...ids].map(async (memberId) => {
      const channel = sb.channel(`member:${memberId}`, {
        config: { broadcast: { self: true } },
      });
      // REST broadcast — no WebSocket subscribe needed; avoids send() fallback warning
      if (typeof channel.httpSend === "function") {
        await channel.httpSend("new_message", message);
      } else {
        await channel.send({
          type: "broadcast",
          event: "new_message",
          payload: message,
        });
      }
      await sb.removeChannel(channel);
    })
  );
}

/** Notify message sender that a recipient read their message */
export async function broadcastMessageRead(senderId, payload) {
  const sb = getClient();
  if (!sb || !senderId) return;

  const channel = sb.channel(`member:${senderId}`, {
    config: { broadcast: { self: true } },
  });
  if (typeof channel.httpSend === "function") {
    await channel.httpSend("message_read", payload);
  } else {
    await channel.send({
      type: "broadcast",
      event: "message_read",
      payload,
    });
  }
  await sb.removeChannel(channel);
}
