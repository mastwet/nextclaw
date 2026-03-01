# 2026-03-01 Windows Update Strategy Fix

## 背景 / 问题

- Windows 用户执行 `nextclaw update` 时出现：`Update failed: no update strategy available`。
- 实际环境已安装 Node/npm，但 CLI 未正确识别到可用更新策略。

## 决策

- 修复可执行文件查找逻辑，确保在 Windows 下正确处理：
  - PATH 分隔符 `;`
  - `Path/PATH/path` 环境变量差异
  - `PATHEXT` 扩展（如 `npm.cmd`）
- 更新命令执行逻辑改为跨平台 shell 选择（Windows 使用 `cmd.exe`，非 Windows 使用 `sh`/`$SHELL`）。
- npm 更新步骤改为使用实际解析到的 npm 可执行路径，避免 `npm` / `npm.cmd` 解析差异。

## 变更内容（迭代完成说明）

- 用户可见变化：
  - Windows 环境执行 `nextclaw update` 不再错误落入 `no update strategy available`。
- 关键实现点：
  - `packages/nextclaw/src/cli/utils.ts`
    - 新增 `findExecutableOnPath`，跨平台查找可执行文件。
    - `which` 改为复用该函数。
  - `packages/nextclaw/src/cli/update/runner.ts`
    - `NEXTCLAW_UPDATE_COMMAND` 执行按平台选择 shell。
    - npm 更新改为直接调用解析到的 npm 可执行路径。
  - `packages/nextclaw/src/cli/utils.which.test.ts`
    - 新增 Windows/POSIX 查找逻辑单测。

## 测试 / 验证 / 验收方式

```bash
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw test -- run src/cli/utils.which.test.ts
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw build
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw lint
PATH=/opt/homebrew/bin:$PATH pnpm -C packages/nextclaw tsc
```

验收点：

- 新增单测通过（覆盖 Windows `PATHEXT` 与 PATH 解析行为）。
- `build/lint/tsc` 全部通过。

## 用户 / 产品视角验收步骤

1. 在 Windows 机器确认已安装 Node/npm（`npm -v` 可用）。
2. 执行 `nextclaw update`。
3. 预期不再出现 `no update strategy available`。
4. 执行 `nextclaw --version`，确认版本可更新/保持最新。

## 发布 / 部署方式

- 本次变更影响 `nextclaw` 包。
- 按发布流程执行：`docs/workflows/npm-release-process.md`。

## 影响范围 / 风险

- Breaking change：否。
- 风险：低，变更集中在可执行文件探测与更新命令调用路径。
