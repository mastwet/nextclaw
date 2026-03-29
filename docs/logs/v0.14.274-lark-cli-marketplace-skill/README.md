# v0.14.274-lark-cli-marketplace-skill

## 迭代完成说明

- 新增 marketplace skill：[`skills/lark-cli/SKILL.md`](skills/lark-cli/SKILL.md)
  - 将上游 [larksuite/cli](https://github.com/larksuite/cli)（`lark-cli` / `@larksuite/cli`）封装为 NextClaw 风格的「安装 / 应用凭证 / OAuth / 就绪检查 / 读写与安全边界」闭环说明。
- 新增 marketplace 元数据：[`skills/lark-cli/marketplace.json`](skills/lark-cli/marketplace.json)
  - 中英双语 `summary` / `description`，并补充 `sourceRepo` 与 `homepage` 指向上游仓库。

## 测试/验证/验收方式

```bash
python3 .agents/skills/marketplace-skill-publisher/scripts/validate_marketplace_skill.py --skill-dir skills/lark-cli
```

- 预期：`Errors: 0`，`Result: OK`。

## 实际上架与验证记录（本次）

- **Publish**：`node packages/nextclaw/dist/cli/index.js skills publish skills/lark-cli --meta skills/lark-cli/marketplace.json --api-base https://marketplace-api.nextclaw.io`  
  输出：`✓ Published new skill: lark-cli`，`Files: 2`。
- **远端条目**：`GET https://marketplace-api.nextclaw.io/api/v1/skills/items/lark-cli` 返回 `200`，`ok: true`，`install.kind=marketplace`。
- **安装冒烟**：在 `/tmp` 临时 `workdir` 执行 `skills install lark-cli` 成功，目录内含 `SKILL.md` 与 `marketplace.json`。若遇 `ECONNRESET` 或短时 `skill item not found`，可稍后重试（网络或索引延迟）。

## 发布/部署方式

- 本次已 **publish**。之后若修改 [`skills/lark-cli`](skills/lark-cli) 并需同步远端：

```bash
node packages/nextclaw/dist/cli/index.js skills update skills/lark-cli --meta skills/lark-cli/marketplace.json --api-base https://marketplace-api.nextclaw.io
```

## 用户/产品视角的验收步骤

1. Marketplace 中可发现 **Lark CLI**（slug：`lark-cli`），摘要与描述含中英字段。
2. `nextclaw skills install lark-cli` 后本地出现 `skills/lark-cli/SKILL.md`。
3. 对话中涉及飞书/Lark CLI 任务时，助手应先确认 `lark-cli` 安装、`config init`、登录与 `auth status`，再执行副作用操作。

## 红区触达与减债记录

- 本次未触达 [`scripts/maintainability-hotspots.mjs`](scripts/maintainability-hotspots.mjs) 所列红区文件：不适用。
