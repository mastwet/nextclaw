# v0.14.38 core-linked release fix

## 迭代完成说明

- 补发 `@nextclaw/core` 及其直接依赖的公开包，修复已发布 `nextclaw` CLI 仍引用旧版 `@nextclaw/core` 的问题。
- 在隔离安装验证中进一步发现，`@nextclaw/ncp` / `@nextclaw/ncp-agent-runtime` 链路也存在同类“代码已变但版本未联动发布”的问题，因此继续补发 NCP 相关公开包与 `nextclaw` CLI。
- 这次补发的目标是让线上安装的 `nextclaw` 能正确拿到 `DisposableStore`、`readAssistantReasoningNormalizationMode` 等当前 CLI 依赖的导出，避免在模块加载阶段直接报错。

## 测试/验证/验收方式

- 执行版本联动更新并检查生成结果。
- 发布后通过 `npm view` 校验新发布的 `nextclaw` 依赖的 `@nextclaw/core`、`@nextclaw/ncp` 等关键版本。
- 在隔离目录安装新版本 `nextclaw`，执行基础 CLI 命令确认不再出现导出缺失错误。

## 发布/部署方式

- 使用 changeset 生成补发版本。
- 先补发 `@nextclaw/core` 链路，再补发 `@nextclaw/ncp` / `@nextclaw/ncp-agent-runtime` 相关链路。
- 发布后同步提交版本文件、changelog、changeset 与本迭代日志。

## 用户/产品视角的验收步骤

1. 升级到本次补发后的最新 `nextclaw` 版本。
2. 执行 `nextclaw --version` 或 `nextclaw restart`。
3. 确认不再出现 `@nextclaw/core` / `@nextclaw/ncp` 导出缺失导致的启动错误。
