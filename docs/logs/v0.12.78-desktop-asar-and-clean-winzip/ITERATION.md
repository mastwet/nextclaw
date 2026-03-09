# v0.12.78 desktop-asar-and-clean-winzip

## 迭代完成说明（改了什么）
- 将桌面打包配置从 `asar: false` 调整为 `asar: true`，避免将 `resources/app/node_modules` 全量裸文件展开到 Windows 分发目录。
- 保持 Windows EXE-only 分发（`--win dir`）不变，但重新生成并上传“干净 zip”（不包含 `__MACOSX` 与 `._*` 元数据文件）。
- 复验范围同时覆盖 Windows 与 macOS 打包与启动冒烟，确保 `asar` 变更未引入平台回归。

## 测试/验证/验收方式
- Windows 打包与可用性（macOS 主机交叉构建 + wine 冒烟）：
  - `pnpm -C apps/desktop exec electron-builder --win dir --x64 --publish never`
  - `wine64 apps/desktop/release/win-unpacked/NextClaw Desktop.exe` 后轮询 `http://127.0.0.1:18791/api/health`
  - 结果：返回 `{"ok":true,"data":{"status":"ok"}}`。
- macOS 打包与可用性：
  - `pnpm -C apps/desktop exec electron-builder --mac dmg --arm64 --publish never`
  - `apps/desktop/scripts/smoke-macos-dmg.sh <dmg-path> 120`
  - 结果：通过。
- 文件数与分发包验证：
  - `find apps/desktop/release/win-unpacked -type f | wc -l`：`127`（相比之前显著下降）。
  - `zip -qry -X <zip> win-unpacked && unzip -Z1 <zip> | wc -l`：`141`（无 `__MACOSX` 膨胀）。

## 发布/部署方式
- 代码改动提交后，沿用现有桌面构建流程。
- 内部验证包通过 GitHub Draft Release 上传，不对外宣传。
- Windows 验证包文件名：`NextClaw-Desktop-win32-x64-unpacked-51614a3-asar-clean.zip`。

## 用户/产品视角的验收步骤
1. 在 GitHub Draft Release 下载 `NextClaw-Desktop-win32-x64-unpacked-51614a3-asar-clean.zip`。
2. 在 Windows 资源管理器中解压压缩包。
3. 双击 `NextClaw Desktop.exe` 启动（无需命令行）。
4. 如遇 SmartScreen，点击 `More info -> Run anyway`。
5. 进入主界面后确认可交互并可正常使用。
