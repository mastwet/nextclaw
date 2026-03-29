# v0.14.273-linear-cli-marketplace-skill

## 迭代完成说明

- 新增 marketplace skill：[`skills/linear-cli/SKILL.md`](skills/linear-cli/SKILL.md)
  - 将上游 [schpet/linear-cli](https://github.com/schpet/linear-cli) 封装为 NextClaw 风格的「安装 / 登录 / 仓库配置 / 就绪检查 / 读写边界 / 排障」闭环说明。
- 新增 marketplace 元数据：[`skills/linear-cli/marketplace.json`](skills/linear-cli/marketplace.json)
  - 中英双语 `summary` / `description`，并补充 `sourceRepo` 与 `homepage` 指向上游仓库。

## 测试/验证/验收方式

- 本地元数据校验：

```bash
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/linear-cli
```

- 预期：`Errors: 0`，`Result: OK`。

## 实际上架与验证记录（本次）

- **Publish**：已在仓库根执行  
  `node packages/nextclaw/dist/cli/index.js skills publish skills/linear-cli --meta skills/linear-cli/marketplace.json --api-base https://marketplace-api.nextclaw.io`  
  输出：`✓ Published new skill: linear-cli`，`Files: 2`。
- **远端条目**：`GET https://marketplace-api.nextclaw.io/api/v1/skills/items/linear-cli` 返回 `200`，`ok: true`，`slug=linear-cli`，`install.kind=marketplace`，`publishedAt`/`updatedAt` 为 `2026-03-29T09:54:37.750Z`（以线上为准）。
- **安装冒烟**：在 `/tmp` 下临时 `workdir` 执行 `skills install linear-cli` 成功，目录内含 `SKILL.md` 与 `marketplace.json`。若遇 `ECONNRESET` 或短时 `skill item not found`，多为网络或索引延迟，可重试安装。

## 发布/部署方式

- 本次已 **publish**。之后若修改 [`skills/linear-cli`](skills/linear-cli) 并需同步远端，使用 **update**（需 `NEXTCLAW_MARKETPLACE_ADMIN_TOKEN`）：

```bash
node packages/nextclaw/dist/cli/index.js skills update skills/linear-cli --meta skills/linear-cli/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- 新 skill 首次上架使用 **publish**：

```bash
node packages/nextclaw/dist/cli/index.js skills publish skills/linear-cli --meta skills/linear-cli/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

- 发布后远端校验（示例）：

```bash
curl -sS https://marketplace-api.nextclaw.io/api/v1/skills/items/linear-cli
```

- 安装冒烟须在**非仓库目录**执行：

```bash
tmp_dir=$(mktemp -d /tmp/nextclaw-marketplace-linear-cli.XXXXXX)
node packages/nextclaw/dist/cli/index.js skills install linear-cli --api-base https://marketplace-api.nextclaw.io --workdir "$tmp_dir"
find "$tmp_dir/skills/linear-cli" -maxdepth 2 -type f | sort
rm -rf "$tmp_dir"
```

## 用户/产品视角的验收步骤

1. 在 NextClaw marketplace 中能看到 **Linear CLI**（slug：`linear-cli`），摘要为中英之一且描述完整。
2. 执行 `nextclaw skills install linear-cli`（或 UI 等价流程）后，本地出现 `skills/linear-cli/SKILL.md`。
3. 在对话中请求 Linear 相关 CLI 任务时，助手应先引导/确认：`linear` 已安装、`linear auth login` 与 `linear config`（按需）、再用 `linear team list` 等做就绪验证，再执行用户任务。

## 红区触达与减债记录

- 本次未触达 [`scripts/maintainability-hotspots.mjs`](scripts/maintainability-hotspots.mjs) 所列红区文件：不适用。
