# v0.0.15 Chat Route Simplification

## 迭代完成说明

- 对会话切换闪烁问题进行路由层重实现，目标是删除双向同步里的复杂分支，避免状态与路由互相抢写。
- 路由重构：
  - `/chat/:sessionId`、`/chat`、`/skills`、`/cron` 明确拆分为独立入口。
  - `ChatPage` 改为显式 `view` 入参（`chat|skills|cron`），不再根据 pathname 推断模式。
- 删除易循环链路：
  - 去掉“`selectedSessionKey` 变化后自动反推路由”的 effect。
  - 会话跳转只通过显式动作触发（点击会话、发送首条消息、删除/新建会话）。
- 会话切换继续使用 URL-safe `sid_` 路由 id，降低路径编码干扰。
- 机制调整：`AGENTS.md` 中迭代制度改为单文件文档（默认 `ITERATION.md`）。

涉及文件：

- `packages/nextclaw-ui/src/App.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `AGENTS.md`

## 测试/验证/验收方式

### 执行命令

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`

### 结果

- `tsc`：通过。
- `build`：通过。
- `lint`：未通过，存在仓库既有问题（非本次改动引入）：
  - `packages/nextclaw-ui/src/components/common/MaskedInput.tsx` 未使用参数。
  - `packages/nextclaw-ui/src/components/config/ProviderForm.tsx` 未使用变量。
  - 其余为既有 `max-lines` 警告。

## 发布/部署方式

1. 发布 `@nextclaw/ui`。
2. 发布包含 UI 资源的 `nextclaw`。
3. 重启服务并清理前端缓存。
4. 按以下验收步骤验证路由稳定性。

## 用户/产品视角的验收步骤

1. 进入主界面，连续点击不同会话。
2. 观察地址栏：应稳定停留在 `/chat/sid_...`，不再来回跳变。
3. 在 `/chat` 新会话发送首条消息，URL 应更新到 `/chat/sid_...`。
4. 在 `/skills`、`/cron` 点击会话，应该切回对应 `/chat/sid_...`。
