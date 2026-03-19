INSERT INTO marketplace_mcp_items (
  id,
  slug,
  name,
  summary,
  summary_i18n,
  description,
  description_i18n,
  tags,
  author,
  source_repo,
  homepage,
  vendor,
  docs_url,
  transport_types,
  trust_level,
  trust_notes,
  install_kind,
  install_spec,
  install_command,
  install_default_name,
  install_template,
  install_inputs,
  content_markdown,
  content_source_url,
  published_at,
  updated_at
) VALUES (
  'mcp-chrome-devtools',
  'chrome-devtools',
  'Chrome DevTools MCP',
  'Connect MCP clients to Chrome DevTools for browser inspection and automation.',
  '{"en":"Connect MCP clients to Chrome DevTools for browser inspection and automation.","zh":"把 MCP 客户端接入 Chrome DevTools，用于浏览器检查与自动化。"}',
  'Official Chrome DevTools MCP server recipe for NextClaw. It runs as a stdio server through npx and is a good default example for marketplace-managed MCP installation.',
  '{"en":"Official Chrome DevTools MCP server recipe for NextClaw. It runs as a stdio server through npx and is a good default example for marketplace-managed MCP installation.","zh":"面向 NextClaw 的官方 Chrome DevTools MCP server recipe。它通过 npx 以 stdio 方式运行，也是 marketplace 管理 MCP 安装的默认示例。"}',
  '["mcp","browser","chrome","devtools","automation"]',
  'Chrome DevTools',
  'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  'Chrome DevTools',
  'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  '["stdio"]',
  'official',
  'Official recipe derived from the upstream Chrome DevTools MCP project.',
  'template',
  'chrome-devtools',
  'nextclaw mcp add chrome-devtools -- npx -y chrome-devtools-mcp@latest',
  'chrome-devtools',
  '{"enabled":true,"transport":{"type":"stdio","command":"npx","args":["-y","chrome-devtools-mcp@latest"],"cwd":"","env":{},"stderr":"pipe"},"scope":{"allAgents":true,"agents":[]},"policy":{"trust":"explicit","start":"eager"},"metadata":{"source":"marketplace","catalogSlug":"chrome-devtools","displayName":"Chrome DevTools MCP","vendor":"Chrome DevTools","docsUrl":"https://github.com/ChromeDevTools/chrome-devtools-mcp","homepage":"https://github.com/ChromeDevTools/chrome-devtools-mcp","trustLevel":"official"}}',
  '[]',
  '# Chrome DevTools MCP

Official MCP server from the Chrome DevTools team.

## What it gives you

- Browser inspection through Chrome DevTools
- Automation and debugging workflows backed by the Chrome DevTools protocol
- A clean stdio transport recipe that works well as a NextClaw marketplace example

## Installed command

`npx -y chrome-devtools-mcp@latest`

## Notes

- This recipe defaults to `all-agents`.
- The server is added as a regular MCP config entry, so enable, disable, remove, and doctor all work through the same hotplug path.',
  'https://github.com/ChromeDevTools/chrome-devtools-mcp',
  '2026-03-19T00:00:00.000Z',
  '2026-03-19T00:00:00.000Z'
) ON CONFLICT(slug) DO UPDATE SET
  name=excluded.name,
  summary=excluded.summary,
  summary_i18n=excluded.summary_i18n,
  description=excluded.description,
  description_i18n=excluded.description_i18n,
  tags=excluded.tags,
  author=excluded.author,
  source_repo=excluded.source_repo,
  homepage=excluded.homepage,
  vendor=excluded.vendor,
  docs_url=excluded.docs_url,
  transport_types=excluded.transport_types,
  trust_level=excluded.trust_level,
  trust_notes=excluded.trust_notes,
  install_kind=excluded.install_kind,
  install_spec=excluded.install_spec,
  install_command=excluded.install_command,
  install_default_name=excluded.install_default_name,
  install_template=excluded.install_template,
  install_inputs=excluded.install_inputs,
  content_markdown=excluded.content_markdown,
  content_source_url=excluded.content_source_url,
  published_at=excluded.published_at,
  updated_at=excluded.updated_at;

INSERT OR IGNORE INTO marketplace_mcp_recommendation_scenes (id, title, description)
VALUES ('mcp-default', 'Recommended MCP Servers', 'Curated MCP server list');

INSERT INTO marketplace_mcp_recommendation_items (scene_id, item_id, sort_order)
VALUES ('mcp-default', 'mcp-chrome-devtools', 10)
ON CONFLICT(scene_id, item_id) DO UPDATE SET sort_order=excluded.sort_order;
