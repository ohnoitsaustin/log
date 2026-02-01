-- activities: user-defined activities with emoji
DROP TABLE IF EXISTS activities;
CREATE TABLE activities (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        text NOT NULL,
  emoji       text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own activities"
  ON activities FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
