# v0.8.8-marketplace-clawbay-actions-sync

## 迭代完成说明（改了什么）

本次迭代完成三项改动：

1. **Marketplace Catalog 增加 Clawbay Channel**
- 文件：`workers/marketplace-api/data/catalog.json`
- 新增 item：`plugin-channel-clawbay`
- 安装 spec：`@clawbay/clawbay-channel`
- 同步加入 `channels` 推荐场景。

2. **Server 侧 Marketplace 过滤规则支持 Clawbay 插件**
- 文件：`packages/nextclaw-server/src/ui/router.ts`
- 插件过滤由“仅 `@nextclaw/channel-plugin-*`”扩展为：
  - `@nextclaw/channel-plugin-*`
  - `@clawbay/clawbay-channel`（含版本 spec 归一）
- 插件 spec 归一函数从 NextClaw 专用拓展为通用 npm scoped spec 归一。

3. **GitHub Actions 自动同步 Worker（以 GitHub 为数据源）**
- 新增 workflow：`.github/workflows/marketplace-catalog-sync.yml`
- 触发：`catalog.json` / worker 相关文件在 `master/main` 变更后自动执行。
- 动作：`validate:catalog` → `build` → `lint` → `tsc` → `wrangler deploy` → 线上 smoke。
- 新增 catalog 校验脚本：`workers/marketplace-api/scripts/validate-catalog.mjs`
- 新增 npm script：`pnpm -C workers/marketplace-api validate:catalog`

## 测试 / 验证 / 验收方式

### 工程验证（本次执行）

- `pnpm -C workers/marketplace-api validate:catalog`
- `pnpm build`
- `pnpm lint`
- `pnpm tsc`

结果：通过（存在历史 lint warning，无 error）。

### 冒烟验证（本次执行）

隔离环境（避免写入仓库目录）：

1. 启动本地 worker：
- `pnpm -C workers/marketplace-api dev --port 18931`

2. 启动本地 nextclaw 服务并指向本地 worker：
- `NEXTCLAW_HOME=/tmp/nextclaw-market-smoke-... NEXTCLAW_MARKETPLACE_API_BASE=http://127.0.0.1:18931 pnpm -C packages/nextclaw dev:build serve --ui-port 18942`

3. 验证 marketplace 列表包含 Clawbay：
- `curl -fsS 'http://127.0.0.1:18942/api/marketplace/items?page=1&pageSize=50'`
- 结果：`found:channel-plugin-clawbay:@clawbay/clawbay-channel`

## 发布 / 部署方式

本次变更涉及 Worker catalog + Server Marketplace 过滤逻辑：

1. Worker 同步（推荐）
- 通过 GitHub Actions workflow `.github/workflows/marketplace-catalog-sync.yml` 自动执行。

2. Worker 同步（兜底）
- `pnpm -C workers/marketplace-api deploy`

3. 后端发布（若包含 server 版本变更）
- 按项目发布流程执行 `changeset -> version -> publish`。

4. 远程 migration
- 不适用（无数据库/后端 schema migration）。

## 用户/产品视角的验收步骤

1. 打开 Marketplace 页面。
2. 搜索 `clawbay`。
3. 观察 `Clawbay Channel Plugin` 已出现在可安装列表中。
4. 点击安装并观察安装命令对应 `@clawbay/clawbay-channel`。
5. 验收通过标准：Clawbay 插件可见且可安装，catalog 变更可通过 GitHub Actions 自动同步到线上。
