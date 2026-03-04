# v0.0.12 Validation

## 执行命令

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`

## 结果

- `tsc`：通过。
- `build`：通过。
- `lint`：未通过，存在仓库既有问题（非本次改动引入）：
  - `packages/nextclaw-ui/src/components/common/MaskedInput.tsx` 未使用参数。
  - `packages/nextclaw-ui/src/components/config/ProviderForm.tsx` 未使用变量。
  - 其余为既有 `max-lines` 警告。

## 冒烟验证（UI）

1. 访问 `/chat`，确认是新会话界面（不自动切入旧会话）。
2. 点击左侧任一历史会话，URL 变为 `/chat/:sessionKey`，右侧展示对应会话。
3. 在 `/chat` 直接发送消息，确认 URL 自动更新为 `/chat/:sessionKey`。
4. 在任意会话点“新任务”，确认跳回 `/chat` 并进入新会话界面。
