PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS platform_email_auth_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('sign_in', 'browser_auth')),
  browser_auth_session_id TEXT,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  client_ip TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (browser_auth_session_id) REFERENCES platform_auth_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_platform_email_auth_codes_lookup
  ON platform_email_auth_codes(email, purpose, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_email_auth_codes_session
  ON platform_email_auth_codes(browser_auth_session_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_platform_email_auth_codes_active
  ON platform_email_auth_codes(consumed_at, expires_at DESC);
