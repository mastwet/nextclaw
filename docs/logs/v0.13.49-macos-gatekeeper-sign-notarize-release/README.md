# v0.13.49 macos gatekeeper sign notarize release

## 迭代完成说明（改了什么）
- 为 desktop 正式发布补齐 macOS 签名与公证链路，修复用户安装后出现“应用已损坏”问题。
- 新增 `apps/desktop/scripts/electron-after-sign.cjs`，在 macOS 打包签名后执行 notarization（`notarytool`）。
- 新增 macOS entitlements 文件：
  - `apps/desktop/build/entitlements.mac.plist`
  - `apps/desktop/build/entitlements.mac.inherit.plist`
- 更新 `apps/desktop/package.json`：
  - 增加 `build.afterSign`
  - 增加 `mac.hardenedRuntime/gatekeeperAssess/entitlements/entitlementsInherit`
  - 增加 `@electron/notarize` 依赖
- 更新 `.github/workflows/desktop-release.yml`：
  - 增加 macOS 签名/公证 secrets 的 fail-fast 校验
  - 移除 macOS 构建中的 `CSC_IDENTITY_AUTO_DISCOVERY=false`
  - 增加 `codesign` / `spctl` / `stapler validate` 验证步骤

## 测试/验证/验收方式
- 本地最小验证：
  - `pnpm -C apps/desktop tsc`
  - `node -e "require('./apps/desktop/scripts/electron-after-sign.cjs')"`
  - `plutil -lint` 校验 entitlements plist
- 线上发布验证：
  - 触发 `desktop-release`（新 tag）
  - 要求 macOS job 通过 `codesign --verify`、`spctl --assess`、`xcrun stapler validate`
  - Windows job 与 smoke 同步通过

## 发布/部署方式
- 合并并推送到 `master` 后打新 tag（如 `v0.9.21-desktop.5`）。
- 通过 `desktop-release` workflow 进行正式发布与资产上传。
- 若 macOS 签名/公证 secrets 缺失，workflow 会直接失败并提示缺失项，避免继续发布不合规包。

## 用户/产品视角的验收步骤
- 从 GitHub Release 下载 macOS DMG。
- 在 macOS 上直接安装并启动（保留下载隔离属性），确认不再出现“已损坏”提示。
- 下载 Windows 包并验证可正常启动。
