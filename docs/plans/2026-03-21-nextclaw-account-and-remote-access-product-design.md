# NextClaw Account And Remote Access Product Design

日期：2026-03-21

## 1. 背景与核心判断

当前 remote access 已经从纯 CLI 能力走到 UI 可操作阶段，但产品边界仍然不清晰：

- `remote access` 页面同时承载账号登录、设备配置、服务控制、诊断等多种职责。
- 用户路径仍然暴露了 `platform.nextclaw.io`、`platform api base`、`remote connect`、`restart service` 这类开发者概念。
- 账号登录目前主要是为 remote access 服务，但未来它还会承载 token 绑定、云能力接入和其它平台能力，因此它不应继续寄生在 remote 页面里。

本方案的核心判断是：

1. `账号登录` 必须被提升为前端全局基础能力，而不是 remote access 的一个子功能。
2. `remote access` 本质上只是“依赖账号的一项设备能力”，它只应负责设备是否可被远程打开。
3. 对用户可见的 remote 控制面必须极简，默认不暴露平台底层概念、服务控制细节和诊断细节。
4. `platform.nextclaw.io` 可以继续作为实现载体存在，但不应成为用户主心智；用户看到的应该是 “NextClaw Web / 网页版 NextClaw”。
5. Cloudflare relay / Durable Objects 成本问题需要单独讨论，不能反过来污染本次产品面和账号边界设计。

## 2. 目标

### 2.1 产品目标

- 让用户能用一条普通产品路径完成 remote access 开启，而不是依赖开发者背景。
- 把账号能力沉淀成前端全局能力，支持未来其它模块复用唤起。
- 让 remote access 页面只保留与“本机是否可远程打开”直接相关的信息和动作。
- 给用户一个稳定、可预测的全局登录状态展示位。

### 2.2 架构目标

- 在前端建立统一的 `Account` 领域模型，而不是让各功能模块各自维护登录逻辑。
- 使用 presenter / manager / store 的分层方式沉淀账号能力和 remote access 能力。
- 保持 UI 组件无业务逻辑，业务流程统一收敛到 manager / presenter。

### 2.3 非目标

- 本方案不讨论 Cloudflare relay、Durable Objects、连接保持策略和平台成本优化。
- 本方案不重新设计远程传输层协议。
- 本方案不引入第二套云端业务 UI。
- 本方案不在这一轮扩展完整的账号中心、订阅中心或 token 管理页，只先建立能力边界与入口。

## 3. 产品原则

### 3.1 Account Is Global Capability

账号是全局能力，不属于 remote access。凡是未来会依赖用户身份的平台能力，都应该复用这套能力。

### 3.2 Remote Access Is Device Capability

remote access 只是设备能力。它回答的问题只有一个：

`这台设备当前能不能被我从别的设备打开？`

### 3.3 Default Surface Must Be Minimal

默认视图里只展示用户当前做决策必须知道的信息，不展示开发者或运维信息。

### 3.4 User Intent Over Internal Topology

用户的目标是“从另一台设备打开这台机器”，不是“进入 platform 控制台管理设备”。

### 3.5 Predictable Behavior

当 remote access 依赖账号、服务状态或连接状态时，界面必须明确表达前置条件和当前阶段，不能让用户猜测“到底是没登录、没开启、没连接，还是服务没重启”。

## 4. 信息架构重构

本次重构后，产品面应拆成三层：

### 4.1 全局账号层：NextClaw Account

职责：

- 登录 / 登出
- 当前账号状态展示
- 当前账号基础信息展示
- 未来 token / 云能力 / 订阅能力的统一承载位
- 为其它模块提供 `ensureSignedIn` 能力

不负责：

- remote access 的设备开关
- remote relay 诊断
- 设备连接状态管理

### 4.2 功能层：Remote Access

职责：

- 开启或关闭当前设备的 remote access
- 展示当前设备是否可远程访问
- 提供通往网页版入口
- 在需要时依赖全局账号能力

不负责：

- 自己实现登录流程
- 承担账号中心角色
- 暴露平台底层地址、API base 或 CLI 术语

### 4.3 外部入口层：NextClaw Web

职责：

- 承载“另一台设备登录后查看并打开设备”的网页入口

对用户文案建议：

- 中文：`在网页中查看设备`、`前往网页版`
- 英文：`Open in Web`、`Go to NextClaw Web`

不建议作为主按钮文案直接使用：

- `前往 platform.nextclaw.io`
- `打开平台控制台`

## 5. 全局账号能力设计

### 5.1 为什么必须抽出来

账号登录目前虽然是 remote access 的前置条件，但未来一定不止服务于 remote：

- token 绑定
- 云功能授权
- 平台资源查看
- 其它需要账号身份的产品能力

如果继续把登录能力长在 remote 页面里，后续每扩展一次平台能力，remote 页面都会继续膨胀。

### 5.2 用户可见入口

建议采用顶级产品常见做法，在全局 app shell 提供统一账号入口：

- 桌面宽屏：侧边栏底部账号区，或右上角账号按钮
- 窄屏：右上角头像 / 菜单入口

展示规则：

- 未登录：`登录 NextClaw`
- 已登录：显示头像占位、邮箱、在线状态或简短说明

点击后打开：

- `Account Panel` 弹层
- 或 `Account` 独立页面

MVP 阶段更推荐先做统一弹层或轻量页面，不急着扩成完整账号中心。

### 5.3 账号面板默认内容

默认展示：

- 登录状态
- 邮箱
- 当前平台连接状态
- 登录 / 登出动作

可选保留一个轻量说明：

- “此账号将用于 remote access 与未来的平台能力”

默认不展示：

- 原始 token
- platform api base
- 调试信息

### 5.4 全局调用能力

任意业务模块都应能通过 presenter 调用：

```ts
presenter.accountManager.ensureSignedIn({ reason: "remote-access" });
presenter.accountManager.openAccountPanel();
presenter.accountManager.logout();
presenter.accountManager.refreshAccount();
```

语义要求：

- `ensureSignedIn` 是“前置条件保证”，不是“业务流程的一部分”
- 业务模块只声明“这里需要账号”，不自己管理登录 UI 细节

## 6. Remote Access 最小化产品面

### 6.1 Remote 页只保留什么

默认只保留五类信息：

1. remote access 是否开启
2. 当前连接状态
3. 当前设备名
4. 通往网页版的入口
5. 关闭 remote access 的动作

### 6.2 默认不保留什么

默认视图里不展示：

- 平台登录表单
- `Platform API Base`
- `remote connect`
- `start / stop / restart service`
- 诊断项明细
- 低层 runtime 状态字段
- 技术域名

这些内容如仍有价值，应进入：

- `高级诊断`
- `开发者设置`
- `故障排查`

而不是放在主路径里。

### 6.3 主页面状态模型

建议把 remote access 默认状态统一为以下五种：

1. `未登录`
2. `已登录但未开启`
3. `准备中`
4. `已可访问`
5. `连接异常`

状态含义：

- `未登录`：当前设备无法开启 remote access，因为缺少账号身份
- `已登录但未开启`：具备前置条件，但设备尚未打开 remote access
- `准备中`：正在执行启用、服务启动或连接建立
- `已可访问`：这台设备已经可在网页版被打开
- `连接异常`：remote access 已开启，但当前未达到“可访问”状态

### 6.4 主动作设计

主动作只保留一个：

- `开启远程访问`

流程：

1. 若未登录，先唤起全局登录能力
2. 登录成功后自动继续执行 remote enable
3. 自动完成必要的服务启动或重启
4. 自动做最小连通性检查
5. 成功后进入结果态

关闭动作：

- `关闭远程访问`

它只负责关闭当前设备的 remote ability，不影响账号登录状态。

### 6.5 成功态设计

成功态建议文案：

- 标题：`这台设备已可远程访问`
- 说明：`在另一台设备登录同一账号后，可在网页版看到并打开这台设备。`

主按钮：

- `在网页中查看设备`

次按钮：

- `复制访问说明`
- 或 `显示二维码`

若要暴露真实域名，放在次级说明中，而不是主按钮文案中。

## 7. 用户主流程

### 7.1 首次开启 remote access

1. 用户进入 `Remote Access`
2. 页面显示 `未登录`
3. 用户点击 `开启远程访问`
4. 系统唤起全局登录
5. 登录成功后自动启用 remote access
6. 系统自动完成服务启动 / 重启与最小健康检查
7. 页面进入 `已可访问`
8. 用户点击 `在网页中查看设备`，了解下一步如何在其它设备打开

### 7.2 已登录用户再次开启

1. 用户进入 `Remote Access`
2. 页面显示 `已登录但未开启`
3. 用户点击 `开启远程访问`
4. 系统直接执行启用链路
5. 页面进入 `准备中`
6. 成功后进入 `已可访问`

### 7.3 日常使用

1. 用户在本机无需关心平台底层细节
2. 用户只知道“这台设备已可访问”
3. 用户在另一台设备打开 NextClaw Web，登录同一账号
4. 在“我的设备”里打开这台设备

## 8. 前端领域建模与 MVP 架构

本仓库已有 presenter / manager / store 模式，因此账号能力与 remote access 能力都应沿此模式落地。

### 8.1 推荐领域拆分

新增或重构为以下领域：

- `account`
- `remote-access`
- `shell`

### 8.2 Store 设计

#### Account Store

职责：

- `status`: `unknown | signed_out | signing_in | signed_in | error`
- `profile`
- `authDialogOpen`
- `lastError`

#### Remote Access Store

职责：

- `enabled`
- `connectionState`
- `deviceName`
- `webEntryUrl`
- `pendingAction`
- `lastError`

#### Shell Store

职责：

- 全局账号入口展开状态
- 全局 toast / modal 协调
- 跨模块导航意图

### 8.3 Manager 设计

#### AccountManager

职责：

- 拉取账号状态
- 打开登录弹层
- 执行浏览器授权
- 登出
- 提供 `ensureSignedIn`

示例 API：

```ts
class AccountManager {
  syncSnapshot = async () => {};
  ensureSignedIn = async (options?: { reason?: string }) => {};
  openAccountPanel = () => {};
  startBrowserAuth = async () => {};
  logout = async () => {};
}
```

#### RemoteAccessManager

职责：

- 拉取 remote 状态
- 开启 / 关闭 remote access
- 调用账号能力作为前置条件
- 生成“前往网页版”的用户动作

示例 API：

```ts
class RemoteAccessManager {
  syncSnapshot = async () => {};
  enableRemoteAccess = async () => {};
  disableRemoteAccess = async () => {};
  openWebPortal = () => {};
  copyOpenInstructions = async () => {};
}
```

### 8.4 Presenter 设计

建议引入更高层的全局 presenter，统一拥有这些 manager：

```ts
class AppPresenter {
  accountManager = new AccountManager();
  remoteAccessManager = new RemoteAccessManager();
  shellManager = new ShellManager();
}
```

跨领域协作原则：

- remote access 调账号能力，只经由 presenter / manager
- 纯展示组件不直接 import manager 或 store 以外的业务能力
- 全局账号入口和 remote 页面共享同一套 account 状态

## 9. 页面与组件建议

### 9.1 Shell 级账号入口

新增：

- `AccountEntry`
- `AccountPanel` 或 `AccountDialog`

职责：

- 统一展示登录状态
- 提供登录 / 登出入口
- 作为未来平台能力的收敛位

### 9.2 Remote Access 页面

重构成三个部分即可：

- `RemoteStatusCard`
- `RemotePrimaryActions`
- `RemoteHelpCard`

其中：

- `RemoteStatusCard` 只关心设备是否可访问
- `RemotePrimaryActions` 只承载开关与网页入口
- `RemoteHelpCard` 给最小说明，不塞诊断细节

高级诊断如仍保留，应折叠并弱化为次级信息。

## 10. 本地 API / 宿主动作边界

这次产品重构不要求马上重写现有宿主 API，但要求前端只消费稳定语义，不把后端内部实现直接映射到用户概念。

前端所需语义可以继续由现有 `/api/remote/*` 提供，但在 view model 层做重新收敛：

- `account status`
- `remote enabled`
- `remote connection state`
- `device name`
- `web portal entry`

若现有接口返回过多内部字段，优先在前端 manager 层做收敛，而不是把全部字段摊到 UI 上。

## 11. 迁移建议

### 11.1 第一阶段：能力抽离

- 抽离全局 account store / manager / presenter 能力
- 增加全局账号入口与登录状态展示位
- 保留 remote 页现有接口调用能力，但不再让其拥有登录流程的主导权

### 11.2 第二阶段：remote 页面极简化

- 移除默认视图中的登录表单
- 移除 `Platform API Base` 默认可见表单项
- 移除服务控制默认可见动作
- 收敛为“开启 / 关闭 / 查看网页版入口”

### 11.3 第三阶段：诊断下沉

- 将服务控制与诊断折叠为高级区域
- 仅在故障排查时暴露

### 11.4 第四阶段：平台统一叙事

- 将用户文案从 `platform.nextclaw.io` 收敛为 `NextClaw Web`
- 让“我的设备”成为网页版中的用户心智入口

## 12. 风险与取舍

### 12.1 风险

- 若全局账号能力抽得不彻底，remote 页面仍可能继续耦合登录实现。
- 若为了兼容旧心智而长期保留大量开发者控件，默认产品面仍会持续膨胀。
- 若没有统一的 shell 级账号入口，未来 token / 订阅 / 平台能力仍会散落到各功能页。

### 12.2 取舍

- 本方案优先做产品面边界收敛，而不是追求一步到位的完整账号中心。
- 本方案允许高级诊断保留，但明确把它降级为次级入口。
- 本方案先确保“用户能理解”，再讨论基础设施成本与 relay 技术路线。

## 13. 与 Cloudflare 成本问题的边界

本方案不直接讨论 Cloudflare Durable Objects 的保留、替换或成本优化。

后续需要单独形成一份基础设施方案，讨论：

- 是否继续采用 Durable Objects
- 是否改用成本更低的 relay 方式
- 是否需要常驻长连
- 是否可以把 remote 能力改成按需连接

这是基础设施层议题，不应反过来决定账号边界和默认产品面。

## 14. 结论

这次重构的正确方向不是继续在 remote 页面上加功能，而是先把“账号”提升为全局能力，再把 remote access 收缩为一个依赖账号的设备能力。

最终产品心智应收敛为：

- 我先登录 NextClaw
- 我开启这台设备的远程访问
- 我在另一台设备的 NextClaw Web 里看到并打开它

而不是：

- 我先理解 platform、api base、service restart、remote connect，再猜应该怎么用
