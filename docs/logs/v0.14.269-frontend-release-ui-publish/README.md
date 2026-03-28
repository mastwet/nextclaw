# v0.14.269-frontend-release-ui-publish

## 迭代完成说明

- 完成前端发布闭环，覆盖 `@nextclaw/ui` 与 `nextclaw` 的版本提升、变更日志更新、npm 发布和 git tag 创建。
- `@nextclaw/ui` 从 `0.11.7` 升到 `0.11.8`，发布内容为前端 UI 的当前补丁批次。
- `nextclaw` 从 `0.16.10` 升到 `0.16.11`，并同步刷新 bundled UI 产物。
- 由于 `@nextclaw/desktop` 依赖 `nextclaw`，其 package 版本与 changelog 也随 changeset 联动更新到 `0.0.105`。
- `packages/nextclaw/ui-dist` 重新生成并同步到当前 UI 构建结果。

## 测试/验证/验收方式

- 执行完整发布命令：
  - `pnpm release:frontend`
- 发布前校验链路实际执行了：
  - `pnpm release:sync-readmes`
  - `pnpm release:check-readmes`
  - `pnpm release:check:groups`
  - `node scripts/check-frontend-release.mjs`
  - `pnpm changeset publish`
  - `pnpm changeset tag`
- 结果：
  - `@nextclaw/agent-chat-ui`、`@nextclaw/ui`、`nextclaw` 的 build / lint / tsc 均通过。
  - lint 仅有既有警告，没有错误。
  - `changeset publish` 成功发布 `nextclaw@0.16.11` 和 `@nextclaw/ui@0.11.8`。
  - git tags 已创建：`nextclaw@0.16.11`、`@nextclaw/ui@0.11.8`。

## 发布/部署方式

- 本次采用仓库标准 npm 发布流程，入口为 `pnpm release:frontend`。
- 该流程会先生成或复用 frontend changeset，然后执行版本更新、前端专项检查、npm publish 和 tag 创建。
- 发布过程遵循 [`docs/workflows/npm-release-process.md`](../../../../docs/workflows/npm-release-process.md)。

## 用户/产品视角的验收步骤

1. 在 npm registry 上确认 `@nextclaw/ui@0.11.8` 与 `nextclaw@0.16.11` 已可安装。
2. 重新安装或升级依赖后，启动前端相关页面或 bundled CLI UI，确认页面可正常加载。
3. 检查 `packages/nextclaw/ui-dist` 对应的打包产物是否与当前源码一致。
4. 如使用桌面壳，确认 `@nextclaw/desktop` 随 `nextclaw` 联动到 `0.0.105`，并且启动不受影响。
