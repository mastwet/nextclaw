# 2026-02-27 v0.0.1-marketplace-data-split

## 迭代完成说明（改了什么）

- Marketplace 数据接口改为按类型彻底分离，不再使用共享入口：
- `plugins` 路由：`/api/marketplace/plugins/items`、`/api/marketplace/plugins/installed`、`/api/marketplace/plugins/install`、`/api/marketplace/plugins/manage`
- `skills` 路由：`/api/marketplace/skills/items`、`/api/marketplace/skills/installed`、`/api/marketplace/skills/install`、`/api/marketplace/skills/manage`
- UI 数据访问层同步切到 typed route，不再请求 `/api/marketplace/items|installed|install|manage` 共享接口。
- 已安装数据视图改为单类型结构：`type + specs + records`，避免同一响应里混入 plugin/skill 两类数据。
- 新增服务端测试，校验 typed route 与 body type 不一致时返回 `INVALID_BODY`。

## 测试 / 验证 / 验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-server test`
- `PATH=/opt/homebrew/bin:$PATH pnpm build`
- `PATH=/opt/homebrew/bin:$PATH pnpm lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm tsc`
- 冒烟（本地 UI）：
- 打开 `/marketplace/plugins`，确认网络请求落在 `/api/marketplace/plugins/*`
- 切换到 `/marketplace/skills`，确认网络请求落在 `/api/marketplace/skills/*`
- 在错误路由下提交不匹配 type，确认返回 `INVALID_BODY`

## 发布 / 部署方式

- 本次涉及前端 UI + `nextclaw-server` 路由行为，属于 npm 包发布变更。
- 依照项目发布流程执行：`changeset -> release:version -> release:publish`。
- 无后端数据库 schema 变更：远程 migration 不适用。

## 用户 / 产品视角的验收步骤

1. 进入 `Marketplace > Plugins`，确认列表与已安装仅展示 plugin 数据。
2. 切换到 `Marketplace > Skills`，确认列表与已安装仅展示 skill 数据。
3. 在 DevTools Network 中确认插件页面不会再请求 `/api/marketplace/skills/*`，技能页面不会再请求 `/api/marketplace/plugins/*`。
4. 执行安装/卸载/启停后，确认仅刷新当前类型数据，不影响另一类型。
