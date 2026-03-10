# v0.13.47 desktop release core/runtime prebuild

## 迭代完成说明（改了什么）
- 修复 desktop 打包链路在 CI 干净环境下缺少 `@nextclaw/core` / `@nextclaw/runtime` 构建产物的问题。
- 在以下链路增加预构建步骤：
  - `.github/workflows/desktop-release.yml`（macOS / Windows）
  - `.github/workflows/desktop-validate.yml`（macOS / Windows）
  - `scripts/desktop-package-build.mjs`
  - `scripts/desktop-package-verify.mjs`
- 将 `apps/desktop/package.json` 的 `asar` 恢复为 `true`，回到正式打包默认策略。

## 测试/验证/验收方式
- 本地执行：`pnpm desktop:package:verify`（macOS）。
- 远程执行：触发 `desktop-release` workflow，观察 macOS / Windows 两个矩阵任务均通过。
- 验收观察点：
  - 不再出现 `@nextclaw/core/dist/index.js` 缺失导致的 `ERR_MODULE_NOT_FOUND`。
  - 上传产物包含 macOS DMG/ZIP 与 Windows unpacked ZIP。

## 发布/部署方式
- 推送修复到 `master`。
- 使用新 tag 触发 `desktop-release`：`v0.9.21-desktop.3`（或更高未使用版本）。
- workflow 成功后，创建/更新 GitHub Release，发布说明按双语双区块（English Version 在前，中文版在后）。

## 用户/产品视角的验收步骤
- 下载 Release 附件中的 macOS 与 Windows 安装包。
- 安装并启动应用，检查桌面端可正常拉起与服务健康检查可达。
- 进入基础流程（初始化/启动）确认不出现模块缺失错误。
