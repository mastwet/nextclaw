# 2026-02-27 v0.0.1-nextclaw-skill-resource-openai

## 迭代完成说明（改了什么）

- 为 `nextclaw-skill-resource-hub` 资源图谱补充 OpenAI 生态来源：
  - `https://github.com/openai/skills`
- 更新文件：
  - `packages/nextclaw-core/src/agent/skills/nextclaw-skill-resource-hub/references/source-map.md`
- 同步补充建议检索词：`openai skills github`。

## 测试 / 验证 / 验收方式

- 构建（core）：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core build`
- Lint（core）：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core lint`
- 类型检查（core）：`PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw-core tsc`
- 冒烟（确认内置 skill 可被识别）：
  - `cd /tmp && PATH=/opt/homebrew/bin:$PATH node -e "import('file:///Users/peiwang/Projects/nextbot/packages/nextclaw-core/dist/index.js').then(({SkillsLoader})=>{const l=new SkillsLoader('/tmp/nextclaw-skill-smoke');const ok=l.listSkills(false).some(s=>s.name==='nextclaw-skill-resource-hub');console.log(ok?'smoke-ok':'smoke-fail');}).catch((e)=>{console.error(e);process.exit(1);})"`

## 发布 / 部署方式

1. 若仅作为资源索引补充，可合并后随下一次常规发布带出。
2. 若需立即发布，按项目流程执行：`changeset -> release:version -> release:publish`。
3. 本次不涉及后端或数据库变更，无 migration。

## 用户 / 产品视角的验收步骤

1. 在 NextClaw 中请求“列出 NextClaw 技能扩展资源”。
2. 结果中应包含 `openai/skills` 链接。
3. 返回应给出“可复用/适配/仅参考”的建议类别。
