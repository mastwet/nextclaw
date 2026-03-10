CREATE TABLE IF NOT EXISTS marketplace_plugin_items (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  summary TEXT NOT NULL,
  summary_i18n TEXT NOT NULL DEFAULT '{}',
  description TEXT,
  description_i18n TEXT,
  tags TEXT NOT NULL DEFAULT '[]',
  author TEXT NOT NULL,
  source_repo TEXT,
  homepage TEXT,
  install_kind TEXT NOT NULL CHECK (install_kind = 'npm'),
  install_spec TEXT NOT NULL,
  install_command TEXT NOT NULL,
  published_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_marketplace_plugin_items_updated_at
  ON marketplace_plugin_items(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_marketplace_plugin_items_slug
  ON marketplace_plugin_items(slug);

CREATE TABLE IF NOT EXISTS marketplace_plugin_recommendation_scenes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS marketplace_plugin_recommendation_items (
  scene_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scene_id, item_id),
  FOREIGN KEY (scene_id) REFERENCES marketplace_plugin_recommendation_scenes(id) ON DELETE CASCADE,
  FOREIGN KEY (item_id) REFERENCES marketplace_plugin_items(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_marketplace_plugin_recommendation_items_scene_order
  ON marketplace_plugin_recommendation_items(scene_id, sort_order ASC);
