-- Chat uses Supabase Realtime Broadcast on topics member:{id}.
-- Realtime Authorization requires SELECT on realtime.messages for authenticated clients.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'realtime'
      AND tablename = 'messages'
      AND policyname = 'authenticated_users_receive_broadcasts'
  ) THEN
    CREATE POLICY authenticated_users_receive_broadcasts
      ON realtime.messages
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;
