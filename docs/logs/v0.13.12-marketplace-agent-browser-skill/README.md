# v0.13.12-marketplace-agent-browser-skill

## 迭代完成说明（改了什么）
- 将 `agent-browser` 技能补充到 Marketplace Skills D1 中（含详情与文件内容）。
- 追加到默认推荐列表 `skills-default`。

## 测试/验证/验收方式
- 未执行 `build/lint/tsc`：本次仅数据写入，未触达构建/类型链路。
- 远程 D1 写入：`wrangler d1 execute MARKETPLACE_SKILLS_DB --remote --file /tmp/marketplace-skill-agent-browser.sql`
- 线上冒烟（隔离目录 `/tmp`）：
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser` → `ok=true`
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser/content` → `ok=true`

## 发布/部署方式
- 数据变更仅需执行远程 D1 写入，无需重新部署 Worker。

## 用户/产品视角的验收步骤
1. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser`，确认返回 `Agent Browser` 条目。
2. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/agent-browser/content`，确认返回 `SKILL.md` 内容。
3. 在 Marketplace UI 搜索 `agent-browser`，确认可见并可安装。
