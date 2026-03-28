# v0.14.263-codex-install-core-singleton-release

## 迭代完成说明

- 定位安装态 `Codex` 会话选择 `minimax/MiniMax-M2.7` 时仍报 `[codex] missing apiBase` 的根因：已发布的 `@nextclaw/openclaw-compat` 把自己的 `@nextclaw/core` runtime 依赖一起发布出去，导致宿主进程出现第二份 `@nextclaw/core` 单例，`resolveProviderRuntime(...)` 拿不到宿主 provider registry 里的 `defaultApiBase`。
- 在 [`packages/nextclaw-openclaw-compat/package.json`](/Users/tongwenwen/Projects/Peiiii/nextclaw/packages/nextclaw-openclaw-compat/package.json) 中把 `@nextclaw/core` 从 runtime `dependencies` 移到宿主 `peerDependencies`，并保留本地开发所需的 `devDependencies`，让 `openclaw-compat` 运行时必须消费宿主 `@nextclaw/core`。
- 新增 [`packages/nextclaw-openclaw-compat/src/package-manifest.test.ts`](/Users/tongwenwen/Projects/Peiiii/nextclaw/packages/nextclaw-openclaw-compat/src/package-manifest.test.ts) 回归测试，锁定 `@nextclaw/core` 不得重新出现在 `openclaw-compat` 的 runtime `dependencies` 里。
- 这次修的是安装态依赖拓扑，不是 bridge fallback，也不是 native backend 绕路。目标是让 `Codex` 会话继续直接走 Codex SDK，同时对齐宿主 provider 单例事实来源。

## 测试/验证/验收方式

- 运行 `pnpm -C packages/nextclaw-openclaw-compat test -- --run src/package-manifest.test.ts`
  - 预期新增 manifest 测试通过，且断言 `@nextclaw/core` 不在 runtime `dependencies` 中。
- 运行 `pnpm -C packages/nextclaw-openclaw-compat test -- --run src/plugins/runtime.test.ts`
  - 预期宿主 runtime 注入相关用例通过，说明改动未破坏 `createPluginRuntime(...)`。
- 运行 `pnpm -C packages/nextclaw-openclaw-compat tsc`
  - 预期类型检查通过。
- 运行 `pnpm -C packages/nextclaw-openclaw-compat build`
  - 预期构建通过，生成新的 `dist` 与类型声明。
- 发布后在安装态执行真实冒烟：
  - 新建 `Codex` 会话
  - 选择 `minimax/MiniMax-M2.7`
  - 发送最小消息，例如 `Reply exactly OK`
  - 预期不再出现 `[codex] missing apiBase`

## 发布/部署方式

- 使用 changeset 联动发布：
  - `@nextclaw/openclaw-compat`
  - `@nextclaw/server`
  - `@nextclaw/remote`
  - `nextclaw`
- 执行顺序：
  - `pnpm release:version`
  - `pnpm release:publish`
- 发布后用户升级安装态 `nextclaw` 即可获得修复，无需额外 fallback 配置。

## 用户/产品视角的验收步骤

1. 升级到本次发布后的 `nextclaw`。
2. 打开 NextClaw 聊天页面，新建 `Codex` 会话。
3. 将模型切到 `minimax/MiniMax-M2.7`。
4. 发送一条最小消息，例如 `Reply exactly OK`。
5. 确认不再出现 `[codex] missing apiBase for model "minimax/MiniMax-M2.7"`，说明安装态 `Codex` 会话已经能正确复用宿主 provider runtime。
