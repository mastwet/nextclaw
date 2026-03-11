# v0.13.66 desktop macos intel package and validation

## 迭代完成说明（改了什么）
- 桌面发布 workflow 补齐 macOS Intel（x64）构建矩阵，与现有 macOS Apple Silicon（arm64）和 Windows x64 一起发布。
- macOS 构建改为按矩阵架构显式打包（`--arm64` / `--x64`），并按架构选择对应 DMG 做冒烟验证。
- 官网下载页补齐 `macOS (Intel)` 下载入口，保持 `macOS (Apple Silicon)` 与 `Windows (x64)` 并列展示。
- 下载元数据解析改为要求稳定版 release 同时包含 `arm64 dmg + x64 dmg + windows zip`，避免把不完整发布暴露给用户。

## 测试/验证/验收方式
- 前端构建验证：
  - `PATH=/opt/homebrew/bin:$PATH pnpm --filter @nextclaw/landing build`
- 发布流水线验证：
  - `desktop-release` workflow（新 run）需包含并通过：
    - `desktop-darwin-arm64`
    - `desktop-darwin-x64`
    - `desktop-win32-x64`
    - `publish-release-assets`
- 发布后抽检：
  - Release 资产必须包含 `...-arm64.dmg` 与 `...-x64.dmg` 以及 `...win32-x64-unpacked.zip`。
  - macOS 两个 DMG 均做 `codesign --verify --deep --strict`；Windows 包内确认 `NextClaw Desktop.exe` 存在。

## 发布/部署方式
- 创建新正式版 tag（非 pre-release），触发 `desktop-release` 上传三平台资产。
- 完成后更新官网下载页（独立下载路由）默认稳定版链接并重新部署 landing。

## 用户/产品视角的验收步骤
1. 打开 `/zh/download/` 或 `/en/download/`。
2. 能看到三个入口：`macOS (Apple Silicon)`、`macOS (Intel)`、`Windows (x64)`。
3. 任意入口下载后可按页面“小白教程”完成首次启动放行。
4. 用户不需要手动去 GitHub 资产列表里自行辨认架构。
