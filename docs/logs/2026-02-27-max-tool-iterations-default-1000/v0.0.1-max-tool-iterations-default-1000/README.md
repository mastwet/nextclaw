# 2026-02-27 v0.0.1-max-tool-iterations-default-1000

## 迭代完成说明（改了什么）

- 将 `@nextclaw/core` 的默认配置 `agents.defaults.maxToolIterations` 从 `20` 提升到 `1000`。
- 用户在未显式配置该项时，Agent 工具调用轮次上限将采用 `1000`，降低复杂任务中因默认上限过低导致的“未收敛兜底回复”。
- 本次发布按依赖联动策略覆盖：`@nextclaw/core`、`@nextclaw/channel-runtime`、`@nextclaw/openclaw-compat`、`@nextclaw/server`、`nextclaw`。

## 测试 / 验证 / 验收方式

- 构建：`pnpm build`
- Lint：`pnpm lint`
- 类型检查：`pnpm tsc`
- 配置默认值冒烟（隔离目录，不写仓库）：
  - `TMP_HOME=$(mktemp -d /tmp/nextclaw-home.XXXXXX)`
  - `NEXTCLAW_HOME="$TMP_HOME" pnpm -C packages/nextclaw dev:build config get agents.defaults.maxToolIterations`
  - 观察点：输出值为 `1000`
  - 清理：`rm -rf "$TMP_HOME"`

## 发布 / 部署方式

1. 生成版本变更：`pnpm release:version`
2. 执行发布：`pnpm release:publish`
3. 若本次变更仅涉及 npm 包（无后端数据库变更），migration 标记为不适用。

## 用户 / 产品视角的验收步骤

1. 在新环境初始化或使用默认配置运行 NextClaw。
2. 查询 `agents.defaults.maxToolIterations` 默认值。
3. 预期结果：默认值为 `1000`。
4. 在工具调用较长的任务中，较不易触发“20 次后未收敛”的兜底回复。
