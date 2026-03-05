# v0.0.1-landing-skill-detail-screenshot

## 迭代完成说明（改了什么）

本次调整官网截图第 4 张素材，移除会话管理截图，改为“技能市场中点击某个 skill 后，右侧查看 skill 详情”的界面。

1. landing 第 4 张截图引用改为 skills + 详情浏览器图（中英文）。
2. 自动截图脚本移除 sessions 场景，新增 skills-detail 场景（中英文）：
   - 进入技能市场
   - 点击技能卡片
   - 等待右侧详情浏览器出现后截图
3. 自动截图 CI 文件收集范围改为 `nextclaw-skills-doc-browser-*.png`。
4. 更新截图流程文档对应产物说明。

## 测试/验证/验收方式

执行：

1. `pnpm screenshots:refresh`
2. `pnpm build`
3. `pnpm lint`
4. `pnpm tsc`

验收点：

1. 新增并更新文件：
   - `apps/landing/public/nextclaw-skills-doc-browser-en.png`
   - `apps/landing/public/nextclaw-skills-doc-browser-cn.png`
   - `images/screenshots/nextclaw-skills-doc-browser-en.png`
   - `images/screenshots/nextclaw-skills-doc-browser-cn.png`
2. 图中可见：左侧 skill 列表 + 选中 skill + 右侧详情浏览器内容。
3. 官网截图顺序保持 4 张，首张仍是对话图，第 4 张为 skill 详情图。

## 发布/部署方式

本次为前端静态资源与自动化截图流程调整，无后端/数据库变更。

1. 合并代码后执行 landing 发布流程。
2. 或手动触发 `Product Screenshot Refresh` 工作流刷新截图并生成 PR。

## 用户/产品视角的验收步骤

1. 打开官网首页，确认最后一张不再是会话管理图。
2. 确认最后一张为“技能详情浏览器”场景（点击技能后的详情视图）。
3. 中英文页面均验证该截图语义一致。
