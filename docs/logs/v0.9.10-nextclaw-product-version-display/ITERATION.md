# v0.9.10-nextclaw-product-version-display

## 迭代完成说明

- 新增运行时应用元信息接口 `/api/app/meta`，由 `nextclaw` 在启动 UI server 时显式注入产品版本号。
- 前端新增统一品牌头组件，在聊天侧边栏与设置侧边栏展示 `NextClaw v<productVersion>`。
- 版本来源明确为 `packages/nextclaw` 的产品版本，而不是 `@nextclaw/ui` 包版本，也不再复用配置 schema 的 `version` 字段。
- 本次已完成 NPM 发布：`nextclaw@0.9.10`、`@nextclaw/server@0.6.4`、`@nextclaw/ui@0.6.7`。

## 测试/验证/验收方式

- 执行 `pnpm build`。
- 执行 `pnpm lint`。
- 执行 `pnpm tsc`。
- 执行真实 CLI 冒烟：`node packages/nextclaw/dist/cli/index.js serve --ui-port 19093`。
- 执行接口冒烟：`curl http://127.0.0.1:19093/api/app/meta` 返回当前 `nextclaw` 产品版本的 JSON 结果。
- 执行页面冒烟：Playwright 断言页面文本包含 `NextClaw vX.Y.Z`。

## 发布/部署方式

- 本次按 [NPM Package Release Process](../../workflows/npm-release-process.md) 执行常规发布流程。
- 执行命令：`pnpm release:version` → `pnpm release:publish`。
- 实际发布结果：
  - `nextclaw@0.9.10`
  - `@nextclaw/server@0.6.4`
  - `@nextclaw/ui@0.6.7`
- 本次不涉及后端远程部署、数据库 migration 与线上 API 迁移，均为“不适用”。

## 用户/产品视角的验收步骤

1. 安装或升级到 `nextclaw@0.9.10`。
2. 启动 NextClaw 本地 UI。
3. 观察聊天页或设置页左上角品牌区。
4. 确认展示格式为 `NextClaw vX.Y.Z`。
5. 核对该版本号与 `nextclaw --version` 输出一致，而不是与 `@nextclaw/ui` 的版本一致。
