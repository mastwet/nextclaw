# v0.14.58-mcp-marketplace-implementation

## 迭代完成说明

- 完成 MCP marketplace 全链路落地：worker catalog 数据源、server 管理接口、UI marketplace 页面、CLI/service 热插拔安装链路、`@nextclaw/mcp` 的安装/管理/诊断域服务。
- MCP 安装模型保持通用化，支持 stdio/http/sse 模板描述；本轮先落官方 `chrome-devtools` recipe，并保留后续继续扩 catalog 的结构。
- 默认 scope 按产品决策实现为公共资源池：marketplace 安装和 CLI `mcp add` 在未显式收口时默认 `all-agents`，不做 per-runtime / per-session 管理。
- marketplace 前端新增独立 MCP 入口与管理视图，支持浏览、安装、查看已安装实例、doctor、enable/disable/remove，并能通过 `config.updated path=mcp` 实时刷新。
- service 侧将 marketplace installer 进一步拆分为独立模块，避免把 MCP / plugin / skill 管理逻辑继续堆进主 service 编排文件。
- 相关方案文档：
  - [MCP Marketplace Management Plan](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-19-mcp-marketplace-management-plan.md)
  - [Generic MCP Registry Plan](/Users/peiwang/Projects/nextbot/docs/plans/2026-03-19-generic-mcp-registry-plan.md)

## 测试/验证/验收方式

- 类型检查：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-mcp tsc`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api tsc`
- 构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build`
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- 定向测试：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test -- --run src/ui/router.marketplace-content.test.ts src/ui/router.marketplace-manage.test.ts`
- 定向 lint：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-mcp lint`
- 可维护性自检：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw/src/cli/commands/service.ts packages/nextclaw/src/cli/commands/service-marketplace-installer.ts packages/nextclaw-server/src/ui/router.ts packages/nextclaw-server/src/ui/types.ts packages/nextclaw-ui/src/api/types.ts packages/nextclaw-ui/src/lib/i18n.ts workers/marketplace-api/src/main.ts`
  - 结果：`Errors: 0`，仍有少量历史 warning，但本次未新增阻塞性可维护性回归。
- 开发态真实冒烟：
  - 启动：`PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-mcp-marketplace-final.XXXXXX) pnpm dev start`
  - 本地 API：`http://127.0.0.1:18793`
  - `GET /api/marketplace/mcp/items?page=1&pageSize=5` 返回 `chrome-devtools`
  - `POST /api/marketplace/mcp/install {"spec":"chrome-devtools","name":"chrome-devtools"}` 返回 `Added MCP server chrome-devtools.`
  - `GET /api/marketplace/mcp/installed` 可看到 `scope.allAgents=true`
  - `POST /api/marketplace/mcp/doctor {"name":"chrome-devtools"}` 返回 `accessible=true`、`toolCount=29`
  - `POST /api/marketplace/mcp/manage {"action":"remove","id":"chrome-devtools"}` 返回 `Removed MCP server chrome-devtools.`
  - 再次 `GET /api/marketplace/mcp/installed` 返回空列表，确认热移除生效。
- 线上 smoke：
  - `PATH=/opt/homebrew/bin:$PATH curl -s https://marketplace-api.nextclaw.io/health`
  - `PATH=/opt/homebrew/bin:$PATH curl -s 'https://marketplace-api.nextclaw.io/api/v1/mcp/items?page=1&pageSize=5'`
  - 结果：健康检查返回 `storage=d1+r2`，MCP catalog 返回 `chrome-devtools`。

## 发布/部署方式

- marketplace worker 已部署到线上：
  - worker：`nextclaw-marketplace-api`
  - version id：`6f70d307-62b3-46d0-afcd-24c84640f6ec`
  - workers.dev：`https://nextclaw-marketplace-api.15353764479037.workers.dev`
  - 正式域名：`https://marketplace-api.nextclaw.io`
- 本次部署包含：
  - MCP catalog/read API
  - `marketplace_mcp_*` D1 表结构
  - 官方 `chrome-devtools` seed 数据
- 本次交付重点是 marketplace 数据与本地热插拔能力落地，未额外执行 NPM 包对外发布；本地 `nextclaw` 开发态与构建态已完成功能验证。

## 用户/产品视角的验收步骤

1. 启动开发环境：`PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME=$(mktemp -d /tmp/nextclaw-mcp-marketplace-final.XXXXXX) pnpm dev start`
2. 打开前端 marketplace，进入新增的 MCP 页面，确认可以看到官方 `Chrome DevTools MCP` 卡片。
3. 点击安装，使用默认名称 `chrome-devtools`，确认安装后“已安装”列表立即出现该实例，且 scope 显示为公共资源池而不是受限 agent。
4. 点击 doctor，确认可以发现工具并返回可访问状态。
5. 进入 native NCP chat/runtime，确认 MCP tools 能作为补充工具源被发现并实际调用。
6. 在 MCP 管理页执行 remove，确认实例立即消失，无需重启 gateway 或 dev service。
