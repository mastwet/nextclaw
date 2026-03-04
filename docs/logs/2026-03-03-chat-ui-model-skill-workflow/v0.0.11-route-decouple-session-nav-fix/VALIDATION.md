# v0.0.11 Validation

## 执行命令

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui build`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-ui lint`

## 结果

- `tsc`：通过。
- `build`：通过。
- `lint`：未通过，存在仓库既有错误（非本次改动新增）：
  - `packages/nextclaw-ui/src/components/common/MaskedInput.tsx` 未使用参数。
  - `packages/nextclaw-ui/src/components/config/ProviderForm.tsx` 未使用变量。
  - 其余为既有 `max-lines` 警告。

## 冒烟验证（UI）

1. 打开 `/skills` 或 `/cron`。
2. 点击左侧会话列表任一会话，预期自动切回 `/chat` 并进入该会话。
3. 在 `/skills` 或 `/cron` 点击“新任务”，预期自动切回 `/chat` 并进入新会话。
4. 直接访问旧链接 `/chat/skills`、`/chat/cron`，预期分别重定向到 `/skills`、`/cron`。
