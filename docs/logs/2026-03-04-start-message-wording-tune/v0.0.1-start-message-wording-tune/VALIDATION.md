# VALIDATION

## 执行命令

```bash
PATH=/opt/homebrew/bin:$PATH pnpm build
PATH=/opt/homebrew/bin:$PATH pnpm lint
PATH=/opt/homebrew/bin:$PATH pnpm tsc
```

```bash
TMP_HOME=$(mktemp -d /tmp/nextclaw-smoke-start-msg-wording.XXXXXX)
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js start --ui-port 19998
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js status
PATH=/opt/homebrew/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js stop
rm -rf "$TMP_HOME"
```

## 实际结果

- `start` 输出包含：`If you need to stop the service, run: nextclaw stop`。
- `status` 显示运行中。
- `stop` 可正常停止服务。
- `build/lint/tsc` 全通过（lint 仅仓库既有 warning，无 error）。
