# v0.13.14-marketplace-skill-zh-i18n

## 迭代完成说明（改了什么）
- 为 `agent-browser` 与 `bocha-skill` 补齐中文摘要与中文描述（summaryI18n/descriptionI18n）。

## 测试/验证/验收方式
- 未执行 `build/lint/tsc`：本次仅 D1 数据更新，未触达构建/类型链路。
- 远程 D1 写入：`wrangler d1 execute MARKETPLACE_SKILLS_DB --remote --file /tmp/marketplace-skill-zh-i18n.sql`
- 线上冒烟（隔离目录 `/tmp`）：
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser`（检查 `summaryI18n.zh` / `descriptionI18n.zh`）
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill`（检查 `summaryI18n.zh` / `descriptionI18n.zh`）

## 发布/部署方式
- 数据变更仅需执行远程 D1 写入，无需重新部署 Worker。

## 用户/产品视角的验收步骤
1. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser`，确认 `summaryI18n.zh` 与 `descriptionI18n.zh` 有中文文案。
2. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill`，确认 `summaryI18n.zh` 与 `descriptionI18n.zh` 有中文文案。
3. Marketplace UI 切换中文语言，确认详情页展示中文描述。
