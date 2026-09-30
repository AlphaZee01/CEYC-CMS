import { useEffect, useRef, useState } from "react";
import { supabase, supabaseConfigured, syncSupabaseRealtimeAuth } from "@/lib/supabase";

/** Debounced postgres_changes on messages + message_recipients (Supabase Realtime). */
export function useChatRealtime(memberId: string | undefined, onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [status, setStatus] = useState<"off" | "connecting" | "live" | "error">(
    supabaseConfigured ? "connecting" : "off"
  );

  useEffect(() => {
    if (!memberId || !supabaseConfigured || !supabase) {
      setStatus("off");
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const schedule = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChangeRef.current(), 300);
    };

    setStatus("connecting");
    void syncSupabaseRealtimeAuth().then(() => {
      if (cancelled || !supabase) return;

      channel = supabase
        .channel(`chat-db:${memberId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, schedule)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, schedule)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "message_recipients" }, schedule)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "message_recipients" }, schedule)
        .subscribe((state, err) => {
          if (state === "SUBSCRIBED") setStatus("live");
          else if (state === "CHANNEL_ERROR" || state === "TIMED_OUT") {
            setStatus("error");
            console.warn("[chat] Realtime postgres_changes:", state, err);
          }
        });
    });

    return () => {
      cancelled = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (channel) supabase.removeChannel(channel);
      setStatus("off");
    };
  }, [memberId]);

  return { realtimeStatus: status };
}
