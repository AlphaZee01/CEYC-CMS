-- Sermon / media library files (audio, video, slides) — served via public URLs.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('church-media', 'church-media', true, 104857600)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY "Public read church media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'church-media');

CREATE POLICY "Admins and leaders upload church media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'church-media' AND is_admin_or_leader());

CREATE POLICY "Admins and leaders update church media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'church-media' AND is_admin_or_leader());

CREATE POLICY "Admins and leaders delete church media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'church-media' AND is_admin_or_leader());
