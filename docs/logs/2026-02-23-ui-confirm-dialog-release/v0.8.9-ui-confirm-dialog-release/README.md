# 2026-02-23 v0.8.9-ui-confirm-dialog-release

## 背景 / 问题

- UI 需要对删除/卸载等高风险动作增加确认流程，减少误操作。
- Marketplace 管理接口在 `id` 不可解析但 `spec` 正确时应能兜底执行。

## 迭代完成说明（改了什么）

- `@nextclaw/ui`
  - 新增可复用 `ConfirmDialog` 组件与 `useConfirmDialog` hook。
  - Sessions 配置页的清空历史/删除会话加入确认弹窗。
  - Marketplace 卸载动作加入确认弹窗。
- `@nextclaw/server`
  - Marketplace 管理接口支持 `spec` 兜底解析真实插件 ID。
- 发布版本：`nextclaw@0.8.9`、`@nextclaw/server@0.5.4`、`@nextclaw/ui@0.5.5`。

## 测试 / 验证 / 验收方式

构建/静态检查/类型检查（release:publish 内含 release:check）：

```bash
PATH=/opt/homebrew/bin:$PATH pnpm release:publish
```

说明：lint 有历史遗留的 max-lines 警告（无 error），未阻断发布。

UI 冒烟（非仓库目录）：

```bash
TMP_HOME=$(mktemp -d /tmp/nextclaw-ui-release-smoke.XXXXXX)
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev start --ui-port 18813 > /tmp/nextclaw-ui-release-smoke.log 2>&1 &
sleep 4
curl -s --max-time 3 --retry 3 --retry-connrefused http://127.0.0.1:18813/api/health
NEXTCLAW_HOME="$TMP_HOME" PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw dev stop
rm -rf "$TMP_HOME"
```

验收点：`/api/health` 返回 `{"ok":true,"data":{"status":"ok"}}`。

## 发布 / 部署方式

按 [`docs/workflows/npm-release-process.md`](../../../workflows/npm-release-process.md) 执行：

```bash
PATH=/opt/homebrew/bin:$PATH pnpm release:version
PATH=/opt/homebrew/bin:$PATH pnpm release:publish
```

- 本次不涉及数据库变更，无 migration 需求。

## 用户 / 产品视角的验收步骤

1. 进入 UI 的 Sessions 页面。
2. 点击“清空历史”或“删除会话”，出现确认弹窗，确认后执行成功。
3. 进入 Marketplace 页面，卸载插件时出现确认弹窗，确认后卸载成功。
4. 对 `id/spec` 不一致的插件执行卸载/禁用，确认不再报 `Plugin not found`。

## 影响范围 / 风险

- 影响范围：`@nextclaw/ui`、`@nextclaw/server`、`nextclaw`。
- Breaking change：否。
- 风险：低（新增确认流程 + 兜底解析）。
