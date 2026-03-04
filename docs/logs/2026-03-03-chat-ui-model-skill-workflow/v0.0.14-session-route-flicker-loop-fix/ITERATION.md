# v0.0.14 Session Route Flicker Loop Fix

## 迭代完成说明

- 修复“点击会话后地址栏与页面来回闪烁”的路由循环问题。
- 根因：会话 key 含特殊字符时，`/chat/:sessionKey` 方案存在路径编码/匹配不稳定风险，触发 `/chat/* -> /chat` 重定向与会话路由回写相互打架。
- 改为稳定的 URL-safe 会话 id：
  - 路由参数使用 `sid_<base64url(sessionKey)>`。
  - UI 内部仍使用原始 `sessionKey`，只在路由层进行编码/解码。
- 保持兼容：若路由不是 `sid_` 格式，仍按旧值解析（历史链接可继续打开）。
- 按“简化优先”进一步去除会话选择时的本地状态抢写：点击会话只做路由跳转，避免 `setState + navigate` 竞态。
- 路由语义补齐为 `:sessionId`（URL 层为 id，内部映射到真实 session key）。

涉及文件：

- `packages/nextclaw-ui/src/App.tsx`
- `packages/nextclaw-ui/src/components/chat/ChatPage.tsx`
- `AGENTS.md`（迭代文档机制改为单文件）

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
2. 发布包含 UI 静态资源的 `nextclaw`（按项目既有发布流程）。
3. 重启服务并清理前端缓存。
4. 验证会话切换时 URL 与页面稳定性。

变更类型判定：纯前端路由稳定性修复；不涉及后端与数据库 migration。

## 用户/产品视角验收步骤

1. 打开主界面并点击一个历史会话。
2. 预期地址栏为 `/chat/sid_...`（路由参数名为 `sessionId`），且不再来回闪烁。
3. 连续切换多个会话，界面不出现长时间闪烁。
4. 新会话发送消息后，URL 正常带上会话 id。
