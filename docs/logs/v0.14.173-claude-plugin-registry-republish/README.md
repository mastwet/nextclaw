# 迭代完成说明

- 补发 Claude NCP runtime plugin 的新版本，修复 npm 上已存在的 `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@0.1.15` 实际仍为旧 artefact，导致从 registry 安装后仍只暴露 `minimax/MiniMax-M2.7` 的问题。
- 本次迭代的根因不是“Claude 本质上不支持这些模型”，而是“已发布插件包内容落后于当前源码”，因此隔离已发布环境仍会落回旧的 `supportedModels` 白名单行为。
- 新版本目标是让从 npm/marketplace 安装出来的 Claude plugin 与当前源码行为一致：
  - 不再对外发布 `supportedModels` 白名单
  - Claude 会话默认复用全局模型目录
  - 真实是否可用交由实际请求链路与上游 provider 返回决定

# 测试/验证/验收方式

- npm registry 安装验证：
  - 在隔离 `NEXTCLAW_HOME=/tmp/...` 下执行 `npx -y nextclaw@0.13.41 plugins install @nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk@<new-version>`
  - 再执行 `npx -y nextclaw@0.13.41 plugins info nextclaw-ncp-runtime-plugin-claude-code-sdk`
- 已发布服务契约验证：
  - `curl -sS http://127.0.0.1:<port>/api/ncp/session-types`
  - 预期 Claude `ready=true`，且不再返回 `supportedModels`
- 真实 Claude 会话冒烟：
  - `pnpm smoke:ncp-chat -- --session-type claude --model openai/gpt-5.4 --port <port> --json`
  - `pnpm smoke:ncp-chat -- --session-type claude --model dashscope/qwen3-coder-next --port <port> --json`
  - `pnpm smoke:ncp-chat -- --session-type claude --model minimax/MiniMax-M2.5 --port <port> --json`

# 发布/部署方式

- 仅补发真正有问题的 npm artefact：
  - `@nextclaw/nextclaw-ncp-runtime-plugin-claude-code-sdk`
- 发布完成后，确保 marketplace / CLI 后续安装与升级都能拉到新的插件版本。
- 若目标环境已安装旧插件版本，需要执行升级或重新安装，使本地插件目录落到新版本。

# 用户/产品视角的验收步骤

1. 升级 Claude runtime plugin 到本次补发版本。
2. 新建一个 `Claude` 会话。
3. 打开模型下拉，确认不再只剩 `minimax/MiniMax-M2.7`。
4. 选择 `openai/gpt-5.4`、`dashscope/qwen3-coder-next`、`minimax/MiniMax-M2.5` 任意一个发送 `Reply exactly OK`。
5. 确认真实收到 `OK`；若失败，应暴露 provider 自身错误，而不是在模型下拉阶段被预先收窄。
