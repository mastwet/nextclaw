# v0.13.13-marketplace-bocha-skill

## 迭代完成说明（改了什么）
- 将 ClawHub 的 `bocha-skill` 上架到 Marketplace（通过 `skills publish` 写入 D1）。
- 补充技能元信息（名称、作者、摘要与标签）。

## 测试/验证/验收方式
- 未执行 `build/lint/tsc`：本次仅 Marketplace 数据写入，未触达构建/类型链路。
- 线上冒烟（隔离目录 `/tmp`）：
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill` → `ok=true`
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill/content` → `ok=true`
  - `curl -sS 'https://marketplace-api.nextclaw.io/api/v1/skills/items?page=1&pageSize=50' | rg -n 'bocha-skill'`

## 发布/部署方式
- `PATH=/opt/homebrew/bin:$PATH node packages/nextclaw/bin/nextclaw skills publish /tmp/bocha-skill --slug bocha-skill ...`

## 用户/产品视角的验收步骤
1. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill`，确认展示 `Bocha Search`。
2. 打开 `https://marketplace-api.nextclaw.io/api/v1/skills/items/bocha-skill/content`，确认返回 `SKILL.md` 内容。
3. 在 Marketplace UI 搜索 `bocha` 或 `bocha-skill`，确认可见并可安装。
