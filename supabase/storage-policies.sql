-- Storage bucket and policies for encrypted media.
-- Run in Supabase Dashboard > SQL Editor after creating the project.

-- Create the private storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('encrypted-media', 'encrypted-media', false);

-- Users can upload to their own folder (user_id as folder prefix)
CREATE POLICY "Users can upload their own media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'encrypted-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can read their own media
CREATE POLICY "Users can read their own media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'encrypted-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own media
CREATE POLICY "Users can delete their own media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'encrypted-media'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
