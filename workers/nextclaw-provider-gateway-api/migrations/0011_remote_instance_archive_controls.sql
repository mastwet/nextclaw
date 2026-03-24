PRAGMA foreign_keys = ON;

ALTER TABLE remote_devices
  ADD COLUMN archived_at TEXT;

CREATE INDEX IF NOT EXISTS idx_remote_devices_user_archived_updated_at
  ON remote_devices(user_id, archived_at, updated_at DESC, id DESC);
