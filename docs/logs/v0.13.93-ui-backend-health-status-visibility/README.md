# v0.13.93-ui-backend-health-status-visibility

## 迭代完成说明（改了什么）
- 为 UI 补充了可感知的连接状态链路：`connecting / connected / disconnected`。
- `WebSocket` 客户端新增 `connection.close` 与 `connection.error` 事件，断连时可被上层感知。
- `useWebSocket` 增加健康探测兜底（轮询 `/api/health`）：
  - WS 已连接时展示 `connected`
  - WS 断开但健康接口可达时展示 `connecting`
  - 健康接口不可达时展示 `disconnected`
- 在聊天主侧边栏顶部接入 `StatusBadge`，直接显示后台连接状态。
- 后端 `/api/health` 返回补充 `services` 维度（`chatRuntime` / `cronService`），便于 UI 与排障观察。

## 测试/验证/验收方式
- 受影响包验证：
  - `pnpm -C packages/nextclaw-ui tsc`（通过）
  - `pnpm -C packages/nextclaw-ui build`（通过）
  - `pnpm -C packages/nextclaw-server tsc`（通过）
  - `pnpm -C packages/nextclaw-server build`（通过）
  - `pnpm -C packages/nextclaw-server lint`（通过，存在历史 warning）
  - `pnpm -C packages/nextclaw-ui lint`（未通过，历史基线问题，非本次改动引入）
- 冒烟验证：
  - 通过构建产物直接请求 `createUiRouter` 的 `/api/health`，断言返回：
    - `ok: true`
    - `data.status: "ok"`
    - `data.services.chatRuntime` / `data.services.cronService` 存在

## 发布/部署方式
- 本次涉及 `@nextclaw/ui` 与 `@nextclaw/server` 代码改动，发布前按影响范围执行：
  - `pnpm -C packages/nextclaw-ui tsc && pnpm -C packages/nextclaw-ui build`
  - `pnpm -C packages/nextclaw-server tsc && pnpm -C packages/nextclaw-server build`
- 如需正式发版，走项目既有 release 流程（changeset version/publish）。
- 不适用项：
  - 远程 migration：不适用（未涉及后端数据库 schema 变更）。

## 用户/产品视角的验收步骤
1. 打开聊天主界面，观察左侧栏顶部状态徽标。
2. 正常连接后应显示“已连接（Connected）”。
3. 断开后端服务（或阻断 API）后，应显示“未连接（Disconnected）”。
4. 后端恢复但 WS 尚在重连窗口时，应显示“连接中（Connecting）”，恢复成功后回到“已连接”。
5. 访问 `/api/health`，确认返回中包含 `services.chatRuntime` 与 `services.cronService`。
