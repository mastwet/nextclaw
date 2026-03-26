# v0.14.218-opencli-marketplace-skill

## 迭代完成说明

- 新增项目内治理 skill：`.codex/skills/nextclaw-marketplace-skill-integration/SKILL.md`
  - 固化 “给 NextClaw 的 skill marketplace 新增 skill” 的产品原则、职责边界与解耦约束。
  - 明确 skill 层负责用户旅程、引导、readiness check、风险披露与确认规则，不伪装成第三方 runtime 本体。
- 新增 marketplace skill：`skills/opencli/SKILL.md`
  - 将上游 `opencli` 能力封装为 NextClaw 风格的完整 skill。
  - 重点覆盖安装引导、浏览器扩展配置、`opencli doctor` readiness check、任务分类、命令发现、安全执行规则与排障路径。
  - 明确外部 CLI passthrough 可能触发自动安装时必须先征得用户确认。
- 新增 marketplace 元数据：`skills/opencli/marketplace.json`
  - 补齐中英文 `summaryI18n` / `descriptionI18n`。
  - 补充 `sourceRepo` 与 `homepage` 指向上游 `jackwener/opencli`。
- 处理远端 marketplace 阻塞：
  - 首次 publish 时，远端 skills D1 缺少 `storage_backend` 列，导致 publish 响应、content 读取与 install 全部报 `D1_ERROR`。
  - 执行 `workers/marketplace-api` 的远端 migration：`0003_skill_files_r2_storage_20260312.sql`。
  - migration 完成后重新执行 `skills update skills/opencli`，使 skill 文件内容正确写入新 schema。
- 最终结果：
  - `opencli` 条目已成功出现在 `https://marketplace-api.nextclaw.io/api/v1/skills/items`
  - content 接口可返回完整 `SKILL.md`
  - `nextclaw skills install opencli` 可成功安装

## 测试 / 验证 / 验收方式

- 本地结构校验：
  - `python3 .codex/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/opencli`
  - 结果：`Errors: 0`，`Warnings: 0`
- 维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths skills/opencli/SKILL.md .codex/skills/nextclaw-marketplace-skill-integration/SKILL.md`
  - 结果：`not applicable`（无 code-like 文件）
- 远端 migration：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api run db:migrate:skills:remote`
  - 结果：成功应用 `0003_skill_files_r2_storage_20260312.sql`
- 远端条目校验：
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/opencli`
  - 观察点：`ok: true`，`slug=opencli`，`install.kind=marketplace`
- 远端内容校验：
  - `curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/opencli/content`
  - 观察点：`ok: true`，返回完整 `bodyRaw`
- 安装冒烟：
  - `tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-opencli.XXXXXX)`
  - `PATH=/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills install opencli --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"`
  - `find "$tmp_dir/skills/opencli" -maxdepth 2 -type f | sort`
  - 观察点：
    - 输出 `✓ Installed opencli (marketplace)`
    - 安装目录内存在 `SKILL.md`
    - 安装目录内存在 `marketplace.json`

## 发布 / 部署方式

- 本地 publish / update 入口：
  - `PATH=/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills publish skills/opencli --meta skills/opencli/marketplace.json --api-base https://marketplace-api.nextclaw.io`
  - `PATH=/opt/homebrew/bin:$PATH node packages/nextclaw/dist/cli/index.js skills update skills/opencli --meta skills/opencli/marketplace.json --api-base https://marketplace-api.nextclaw.io`
- 本次实际执行：
  1. 首次 `publish` 触发远端建条目，但因 skills D1 schema 过旧导致响应失败。
  2. 执行远端 migration：`PATH=/opt/homebrew/bin:$PATH pnpm -C workers/marketplace-api run db:migrate:skills:remote`
  3. 重新执行 `skills update skills/opencli`
  4. 用 `items/opencli`、`items/opencli/content`、`skills install opencli` 做远端闭环验证
- 后续同类 skill 上架建议：
  - 先跑本地校验脚本
  - 若 publish / content / install 出现 `storage_backend` 类 schema 错误，优先检查 `workers/marketplace-api` 的 remote migrations 是否齐全

## 用户 / 产品视角的验收步骤

1. 打开 marketplace skill 列表接口：
   - `https://marketplace-api.nextclaw.io/api/v1/skills/items?page=1&pageSize=20`
   - 确认能看到 `OpenCLI`
2. 打开 skill 详情接口：
   - `https://marketplace-api.nextclaw.io/api/v1/skills/items/opencli`
   - 确认中英文摘要、描述、来源仓库与安装命令正常
3. 打开 skill 内容接口：
   - `https://marketplace-api.nextclaw.io/api/v1/skills/items/opencli/content`
   - 确认可看到完整 `SKILL.md` 内容
4. 在一台目标机器上执行安装：
   - `nextclaw skills install opencli`
   - 确认安装成功并生成 `skills/opencli/SKILL.md`
5. 在 NextClaw 中请求一个 `opencli` 相关任务：
   - 观察 AI 是否先做 `opencli` 安装/doctor/浏览器扩展/登录态检查
   - 观察 AI 是否在高风险写操作前主动请求确认
