# 迭代完成说明

- 将插件市场“已安装插件”视图的探测链路切换为显式 `validate` 轻量模式，只收集可发现的插件元数据，不再在页面进入时导入外部插件运行时代码。
- 为 `buildPluginStatusReport` 增加可透传的 `mode` 参数，保持其它真实运行时装载调用继续使用原有 full load 行为。
- 新增回归测试，验证 `/api/marketplace/plugins/installed` 仍能返回外部插件记录，但不会触发外部插件模块导入副作用。

# 测试/验证/验收方式

- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server test -- --run src/ui/router.marketplace-installed.test.ts src/ui/router.marketplace-manage.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat test -- --run src/plugins/loader.bundled-enable-state.test.ts src/plugins/loader.ncp-agent-runtime.test.ts`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat tsc`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat lint`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/server build`
- `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/openclaw-compat build`
- `PATH=/opt/homebrew/bin:$PATH node .codex/skills/post-edit-maintainability-guard/scripts/check-maintainability.mjs --paths packages/nextclaw-openclaw-compat/src/plugins/status.ts packages/nextclaw-server/src/ui/router/marketplace/installed.ts packages/nextclaw-server/src/ui/router.marketplace-installed.test.ts`

# 发布/部署方式

- 本次仅涉及服务端市场插件已安装视图的探测实现与测试，无需单独 migration。
- 按常规包发布流程执行受影响包的版本管理、构建与发布即可；若合并到线上服务，重新部署 `@nextclaw/server` 对应宿主进程即可生效。

# 用户/产品视角的验收步骤

1. 启动 NextClaw UI 服务，并确保本地存在至少一个外部插件。
2. 首次进入“Plugins”页面，确认页面能够展示已安装插件列表。
3. 重复离开并重新进入“Plugins”页面，确认页面响应明显快于之前，且不会因为页面进入触发插件副作用。
4. 在页面内执行启用、禁用、卸载等操作，确认管理行为仍然正常。
5. 对已安装插件做真实运行验证，确认插件在非市场页面/真实运行链路中仍能正常装载与工作。

