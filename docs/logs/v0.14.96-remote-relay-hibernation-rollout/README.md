# v0.14.96-remote-relay-hibernation-rollout

## 迭代完成说明

- 完成 remote relay 成本优化方案的代码落地，路线遵循：
  - [Remote Relay Hibernation Cost Optimization Design](../../plans/2026-03-21-nextclaw-remote-relay-hibernation-cost-optimization-design.md)
  - [Remote Access Overall Execution Plan](../../plans/2026-03-21-nextclaw-remote-access-overall-execution-plan.md)
- `workers/nextclaw-provider-gateway-api` 已切换到 Cloudflare WebSocket Hibernation 兼容写法：
  - connector WebSocket 改为通过 Durable Object `state.acceptWebSocket(...)`
  - 连接态元数据改为通过 WebSocket attachment 持有
  - relay 生命周期改为 `webSocketMessage` / `webSocketClose` / `webSocketError`
- `@nextclaw/remote` 已移除 connector 15 秒应用层 heartbeat，避免空闲期间持续唤醒 DO 和写库。
- remote device 在线判断已从“依赖最近 30 秒 last_seen_at”改为“直接依赖数据库 status”，避免为了伪在线而保留高频 ping。
- remote session 的 `last_used_at` 改为 60 秒节流更新，降低代理请求下的 D1 写放大。
- 增加真实本地冒烟脚本：
  - [remote-relay-hibernation-smoke.mjs](../../../scripts/remote-relay-hibernation-smoke.mjs)
- 完成版本提升与发布闭环：
  - `nextclaw@0.13.16` 已成功发布
  - `@nextclaw/remote@0.1.8`、`@nextclaw/mcp@0.1.12`、`@nextclaw/server@0.10.12` 已完成版本提升并打 tag
  - `@nextclaw/desktop@0.0.52` 因内部依赖联动完成版本提升，但为私有应用，不走 npm 发布
- 完成平台后端部署：
  - 远程 D1 migration 结果：`No migrations to apply`
  - Cloudflare Worker 已发布到 `ai-gateway-api.nextclaw.io`
  - 本次线上 Worker Version ID：`4565e26a-e2ac-4cba-99b3-a8176730cc9d`

## 测试/验证/验收方式

- 受影响代码验证：
  - `pnpm -C workers/nextclaw-provider-gateway-api build`
  - `pnpm -C workers/nextclaw-provider-gateway-api lint`
  - `pnpm -C workers/nextclaw-provider-gateway-api tsc`
  - `pnpm -C packages/nextclaw-remote build`
  - `pnpm -C packages/nextclaw-remote lint`
  - `pnpm -C packages/nextclaw-remote tsc`
  - `pnpm -C packages/nextclaw build`
  - `pnpm -C packages/nextclaw lint`
  - `pnpm -C packages/nextclaw tsc`
- 本地真实 relay 冒烟：
  - `node scripts/remote-relay-hibernation-smoke.mjs`
  - 断言点：
    - connector 上线后空闲 18 秒，`remote_devices.last_seen_at` / `updated_at` 不再因 heartbeat 变化
    - open 设备后 remote proxy 可访问本地 `/probe`
    - local auth bridge cookie 被正确透传
    - 短时间连续代理请求不会刷新 `remote_sessions.last_used_at`
    - connector 退出后设备状态回落为 `offline`
- 发布前全仓质量门：
  - `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:version`
  - `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:publish`
  - 说明：全仓 `build` / `lint` / `tsc` 均通过；lint 输出仅包含仓库既有 warnings，无新增 errors
- 生产环境真实冒烟：
  - 使用隔离 `NEXTCLAW_HOME`、临时本地 fake UI server、真实 `nextclaw remote connect --once` 对 `https://ai-gateway-api.nextclaw.io` 完成整链路验证
  - 实际通过的生产验收观察点：
    - 新注册用户 `remote-prod-smoke.1774091218269@example.com` 可登录并启动 connector
    - 设备 `6a456660-5c52-4290-80d1-25953640fcdf` 在生产环境成功进入 `online`
    - 空闲 18 秒后设备仍保持 `online`
    - `POST /platform/remote/devices/:id/open` 返回有效 `openUrl`
    - 访问 `openUrl` 后拿到 remote session cookie
    - 通过 session cookie 访问生产 `/probe?hit=1` / `/probe?hit=2`，成功桥接到本地 fake UI，并拿到 `nextclaw_ui_bridge=prod-smoke-bridge`
    - connector 停止后设备状态成功回落为 `offline`
- 可维护性守卫：
  - `node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths workers/nextclaw-provider-gateway-api/src/remote-relay-do.ts workers/nextclaw-provider-gateway-api/src/controllers/remote-controller.ts packages/nextclaw-remote/src/remote-connector.ts scripts/remote-relay-hibernation-smoke.mjs`

## 发布/部署方式

- NPM 发布：
  - 先执行 `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:version`
  - 再执行 `NPM_CONFIG_USERCONFIG=/Users/tongwenwen/Projects/Peiiii/nextclaw/.npmrc pnpm release:publish`
  - 本次实际新增发布包：`nextclaw@0.13.16`
  - `@nextclaw/remote@0.1.8`、`@nextclaw/mcp@0.1.12`、`@nextclaw/server@0.10.12` 在 npm 已存在同版本，因此 changeset 自动跳过重复发布，仅补齐 tag
- 平台后端部署：
  - `pnpm deploy:platform:backend`
  - 该命令包含：
    - `pnpm platform:db:migrate:remote`
    - `pnpm -C workers/nextclaw-provider-gateway-api run deploy`
- 文档影响检查：
  - 本次无需新增独立用户手册，原因是本轮只交付 relay 成本侧实现与发布闭环，产品交互改造仍以设计文档为准：
    - [Account And Remote Access Product Design](../../plans/2026-03-21-nextclaw-account-and-remote-access-product-design.md)

## 用户/产品视角的验收步骤

1. 安装或升级到 `nextclaw@0.13.16`。
2. 在本地确保 UI/API 可访问，然后执行登录：`nextclaw login`。
3. 执行远程连接：`nextclaw remote connect`。
4. 打开平台设备页，确认设备能进入在线状态，且空闲放置后不会因为 heartbeat 假在线机制缺失而异常闪断。
5. 点击平台中的“打开设备”，确认能进入远程访问页面。
6. 在远程页面访问本地受保护资源，确认 local auth bridge 生效。
7. 停止本地 connector，确认平台设备状态回落为离线。
