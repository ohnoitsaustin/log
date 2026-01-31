-- Initial schema for Log: encrypted personal journal
-- All entry content is encrypted client-side; the server only stores ciphertext.

-- key_checks: verify passphrase correctness without storing the key
CREATE TABLE key_checks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  salt        bytea NOT NULL,
  iv          bytea NOT NULL,
  check_blob  bytea NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE key_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own key_checks"
  ON key_checks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- entries: journal entries (encrypted blobs)
CREATE TABLE entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  encrypted_blob  bytea NOT NULL,
  iv              bytea NOT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE INDEX idx_entries_user_created ON entries(user_id, created_at DESC);

ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entries"
  ON entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- tags: plaintext tag names for server-side filtering
CREATE TABLE tags (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own tags"
  ON tags FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- entry_tags: many-to-many join
CREATE TABLE entry_tags (
  entry_id  uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  tag_id    uuid NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, tag_id)
);

ALTER TABLE entry_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own entry_tags"
  ON entry_tags FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_tags.entry_id
        AND entries.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM entries
      WHERE entries.id = entry_tags.entry_id
        AND entries.user_id = auth.uid()
    )
  );

-- media: encrypted media attachment metadata
CREATE TABLE media (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id      uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path  text NOT NULL,
  iv            bytea NOT NULL,
  mime_type     text NOT NULL,
  size_bytes    bigint,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_media_entry ON media(entry_id);

ALTER TABLE media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own media"
  ON media FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
