-- Supabase Realtime: postgres_changes on messages + message_recipients

CREATE OR REPLACE FUNCTION public.chat_current_member_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.member_id
  FROM users u
  WHERE u.auth_user_id = auth.uid()::text
  LIMIT 1;
$$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_recipients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_messages_select ON public.messages;
CREATE POLICY chat_messages_select ON public.messages
  FOR SELECT TO authenticated
  USING (
    from_id = chat_current_member_id()
    OR EXISTS (
      SELECT 1 FROM message_recipients mr
      WHERE mr.message_id = messages.id
        AND mr.member_id = chat_current_member_id()
    )
  );

DROP POLICY IF EXISTS chat_recipients_select ON public.message_recipients;
CREATE POLICY chat_recipients_select ON public.message_recipients
  FOR SELECT TO authenticated
  USING (member_id = chat_current_member_id());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'message_recipients'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_recipients;
  END IF;
END $$;
