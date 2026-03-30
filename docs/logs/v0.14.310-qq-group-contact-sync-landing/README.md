# v0.14.310-qq-group-contact-sync-landing

## 迭代完成说明

- 将项目英文 README 的社群二维码从微信群切换为 QQ 群图，素材改为 [`images/contact/nextclaw-contact-qq-group.jpg`](../../../images/contact/nextclaw-contact-qq-group.jpg)。
- 将项目中文 README 的社群入口与社群二维码同步切换为 QQ 群图，避免中英文入口不一致，相关文件为 [`README.zh-CN.md`](../../../README.zh-CN.md)。
- 保持 landing 现有按钮、弹窗、页脚逻辑不变，仅把落地页社群图与文案从微信群切换到 QQ 群，相关源码为 [`apps/landing/src/main.ts`](../../../apps/landing/src/main.ts)。
- 重新部署 landing，当前本次 Pages 预览地址为 `https://0647a4ca.nextclaw-landing.pages.dev`。

## 测试/验证/验收方式

- 构建验证：`PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing build`
- 本地冒烟：
  - `PATH=/opt/homebrew/bin:$PATH pnpm -C apps/landing preview --host 127.0.0.1 --port 4173`
  - `curl -I http://127.0.0.1:4173/contact/nextclaw-contact-qq-group.jpg`
  - `rg -n "nextclaw-contact-qq-group|QQ Group|QQ群" apps/landing/dist`
- 线上冒烟：
  - `curl -I https://0647a4ca.nextclaw-landing.pages.dev/contact/nextclaw-contact-qq-group.jpg`
- 可维护性守卫：
  - `PATH=/opt/homebrew/bin:$PATH pnpm lint:maintainability:guard`
  - 结果：失败，失败项来自工作区中既有的 NCP / agent 相关改动，不是本次 README / landing QQ 联系方式替换引入。

## 发布/部署方式

- 执行：`PATH=/opt/homebrew/bin:$PATH pnpm deploy:landing`
- Wrangler 返回：`https://0647a4ca.nextclaw-landing.pages.dev`
- 本次仅发布 landing 静态站点；NPM 包发布、后端部署、数据库 migration 均不适用。

## 用户/产品视角的验收步骤

1. 打开项目英文 README，确认 Community 区块展示为 QQ 群二维码而不是微信群二维码。
2. 打开项目中文 README，确认顶部社群入口与“社群”区块均展示 QQ 群二维码。
3. 打开 `https://nextclaw.io/en/` 或本次 Pages 预览地址，确认社区按钮、弹窗、页脚指向的都是 QQ 群图片。
4. 打开 `https://nextclaw.io/zh/` 或本次 Pages 预览地址，确认中文文案显示为“QQ群/加入QQ群/QQ群二维码”。
