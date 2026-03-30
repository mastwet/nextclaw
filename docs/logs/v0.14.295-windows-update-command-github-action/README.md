# v0.14.295-windows-update-command-github-action

## 迭代完成说明（改了什么）

- 新增 `windows-update-smoke` GitHub Actions 工作流，专门在 Windows runner 上验证 `nextclaw update`。
- 工作流采用“安装已发布 `nextclaw` CLI + 执行 `nextclaw update --timeout 120000`”的真实用户路径。
- 通过 `NEXTCLAW_UPDATE_COMMAND='node -e "process.exit(0)"'` 让更新步骤可重复、可预测，并在脚本中断言 `Update complete` 成功标记。
- 修正了 PowerShell 输出匹配逻辑，避免命令成功但文本断言误判失败。

## 测试/验证/验收方式

- GitHub Actions 运行：
  - Workflow: `windows-update-smoke`
  - Run ID: `23747292004`
  - Job: `windows-update-smoke`
  - 结果：通过（Windows 环境 `nextclaw update` 命令成功）
- 关键观察点：
  - `Run nextclaw update on Windows` 步骤退出码为 0
  - 输出包含 `Update complete`

## 发布/部署方式

- 该变更为 CI 验证链路增强，无需独立部署。
- 合并到 `master/main` 后，后续涉及 `packages/nextclaw` 或该 workflow 文件变更时会自动触发；也可手动 `workflow_dispatch` 触发复验。

## 用户/产品视角的验收步骤

1. 在 GitHub 仓库 Actions 页面打开 `windows-update-smoke`。
2. 手动触发一次 workflow（或提交一次 `packages/nextclaw` 相关变更触发）。
3. 确认 `windows-update-smoke` job 成功。
4. 在日志中确认 `Run nextclaw update on Windows` 显示 `Update complete`，即可判定 Windows 下更新命令链路可用。
