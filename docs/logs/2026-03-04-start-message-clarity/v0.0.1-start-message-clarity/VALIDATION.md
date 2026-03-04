# VALIDATION

## 执行命令

```bash
PATH=/opt/homebrew/bin:$PATH pnpm build
PATH=/opt/homebrew/bin:$PATH pnpm lint
PATH=/opt/homebrew/bin:$PATH pnpm tsc
```

```bash
TMP_HOME=$(mktemp -d /tmp/nextclaw-smoke-start-msg.XXXXXX)
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js start --ui-port 19997
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js status
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js stop
rm -rf "$TMP_HOME"
```

## 实际结果

- 构建、Lint、类型检查均通过。
- Lint 仅有仓库既有 warning，无 error。
- `start` 输出包含：
  - `Service controls:`
  - `Check status: nextclaw status`
  - `Stop later (this command is only a hint): nextclaw stop`
- `status` 显示 `Process: running`，证明提示中的 `nextclaw stop` 只是后续可执行命令，不代表当前已停止。
- `stop` 执行后输出 `✓ nextclaw stopped`，服务可正常关闭。
