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
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "new_message",
        payload: message,
      });
      await sb.removeChannel(channel);
    })
  );
}
