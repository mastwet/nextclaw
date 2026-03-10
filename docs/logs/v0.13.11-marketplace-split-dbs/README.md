# v0.13.11-marketplace-split-dbs

## 迭代完成说明（改了什么）
- Marketplace API Worker 改为技能/插件双 D1 数据库绑定，运行态完全解耦。
- 新增技能与插件两套迁移目录与 schema，并将历史 skills 数据与官方 channel 插件 seed 迁移到 D1。
- `/health` 端点补充 `databases` 字段，便于线上校验双库状态。
- 文档更新为双数据库初始化、迁移与部署说明。

## 测试/验证/验收方式
- 未执行 `build/lint/tsc`：当前环境缺少依赖与 `pnpm` PATH，未安装依赖。
- 远程迁移：
  - `wrangler d1 migrations apply MARKETPLACE_SKILLS_DB --remote`
  - `wrangler d1 migrations apply MARKETPLACE_PLUGINS_DB --remote`
- 线上冒烟（隔离目录 `/tmp`）：
  - `curl -sS https://marketplace-api.nextclaw.io/health` → `ok=true`，`databases=["skills","plugins"]`
  - `curl -sS 'https://marketplace-api.nextclaw.io/api/v1/skills/items?page=1&pageSize=5'` → `total=11`
  - `curl -sS 'https://marketplace-api.nextclaw.io/api/v1/plugins/items?page=1&pageSize=5'` → `total=10`

## 发布/部署方式
- `wrangler d1 migrations apply MARKETPLACE_SKILLS_DB --remote`
- `wrangler d1 migrations apply MARKETPLACE_PLUGINS_DB --remote`
- `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api run deploy`

## 用户/产品视角的验收步骤
1. 打开 `https://marketplace-api.nextclaw.io/health`，确认 `databases` 包含 `skills` 和 `plugins`。
2. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items?page=1&pageSize=5`，确认返回 5 条数据且 `total` > 0。
3. 打开 `https://marketplace-api.nextclaw.io/api/v1/plugins/items?page=1&pageSize=5`，确认返回 5 条数据且 `total` > 0。
