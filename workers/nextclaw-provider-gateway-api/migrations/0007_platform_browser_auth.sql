-- Browser-based platform authorization sessions for local NextClaw device linking.

CREATE TABLE IF NOT EXISTS platform_auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_auth_sessions_status_expires_at
  ON platform_auth_sessions(status, expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_auth_sessions_user_updated_at
  ON platform_auth_sessions(user_id, updated_at DESC, id DESC);
