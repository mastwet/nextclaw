# 2026-02-23 Config Watch Fix (v0.8.7)

## 迭代完成说明（改了什么）
- 将配置热重载监听范围从配置目录缩小到 `config.json` 文件本身，避免递归监听导致 inotify watcher 耗尽。
- 发布版本更新：`nextclaw@0.8.7`。

## 测试/验证/验收方式
- 构建/静态检查/类型检查（release:check）：
  - `PATH=/tmp/pnpm-shim:/tmp/node-v22.22.0/node-v22.22.0-darwin-arm64/bin:$PATH pnpm release:check`
  - 结果：通过；存在既有 lint 警告（非本次变更引入），无 error。
- 冒烟测试（非仓库目录）：
  - `TMP_HOME=$(mktemp -d /tmp/nextclaw-smoke-XXXXXX)`
  - `printf '{"providers":{"openai":{"apiKey":"test"}}}' > "$TMP_HOME/config.json"`
  - `PATH=/tmp/pnpm-shim:/tmp/node-v22.22.0/node-v22.22.0-darwin-arm64/bin:$PATH NEXTCLAW_HOME="$TMP_HOME" node packages/nextclaw/dist/cli/index.js gateway --port 18991`
  - 观察点：启动输出包含 `✓ Heartbeat: every 30m`，且无 `ENOSPC` 报错；配置目录不写入仓库路径。

## 发布/部署方式
- 发布流程（按 `docs/workflows/npm-release-process.md`）：
  - `pnpm release:version`（已完成）
  - `pnpm release:check`（已完成）
  - `pnpm changeset publish`（已完成，发布 `nextclaw@0.8.7`）
  - `pnpm changeset tag`（已完成，tag `nextclaw@0.8.7` 指向发布提交）
- 远程 migration：不适用（无后端/数据库变更）。
- 线上关键 API 冒烟：不适用（本次为 CLI 内部监听调整）。

## 用户/产品视角的验收步骤
1. 升级到 `nextclaw@0.8.7`。
2. 启动网关服务（本地或服务器）：`nextclaw gateway` / `nextclaw serve`。
3. 确认不再出现 `ENOSPC: System limit for number of file watchers reached`。
4. 修改 `config.json` 后观察热重载正常触发（无崩溃/重启失败）。

## 文档影响检查
- 不适用：本次变更为内部监听范围收敛，用户侧文档无需更新。
