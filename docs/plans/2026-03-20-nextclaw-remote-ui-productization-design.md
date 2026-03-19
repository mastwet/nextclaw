# NextClaw Remote Access UI Productization Design

日期：2026-03-20

## 1. 结论

`remote access` 的下一阶段不应该再以 CLI 为主，而应该切换为：

- UI 主用
- CLI 兜底
- runtime 仍然只有一套

也就是说，用户的主路径应从：

```bash
nextclaw login
nextclaw remote enable
nextclaw start
```

转成：

1. 打开本地 NextClaw UI
2. 进入“远程访问”
3. 登录平台
4. 打开远程访问开关
5. 点击“启动服务”或“重启服务”
6. 在另一台设备的 NextClaw Platform 中进入当前设备

CLI 仍然保留，但角色要降级为：

- 高级入口
- 调试入口
- 自动化脚本入口

不能再要求普通用户必须打开终端才能完成启用和诊断。

## 2. 设计目标

### 2.1 目标

- 让用户在 UI 内完成 remote access 的完整主流程。
- 不新增第二套 remote 实现，UI 与 CLI 复用同一套宿主动作。
- 让 remote 成为现有本地服务的一项可视化能力，而不是单独的命令行子系统。
- 保持当前已拆出的 `@nextclaw/remote` 作为 runtime 内核，不把页面逻辑再耦回去。
- 为未来升级到网页授权登录、设备管理页、多设备列表保留扩展缝。

### 2.2 非目标

- 这一步不做独立桌面配置器。
- 这一步不把 remote 逻辑做进 Cloudflare 平台前端。
- 这一步不新增第二套 remote controller / relay runtime。
- 这一步不强行先上完整 OAuth browser flow 再开始产品化。

## 3. 产品判断

这里有三种路径：

### 方案 A：继续以 CLI 为主，UI 只展示状态

优点：

- 改动小
- 风险低

缺点：

- 用户仍然需要终端
- 登录、启用、诊断被割裂
- 产品体验始终像开发者工具，不像面向普通用户的能力

结论：不推荐。

### 方案 B：UI 做一层“按钮调用 CLI”

优点：

- 表面上接得快

缺点：

- 本质还是两套产品入口
- 错误处理差
- 跨平台稳定性差
- UI 最终会变成命令包装器

结论：不推荐。

### 方案 C：UI 和 CLI 统一调用宿主层 `remote host actions`

优点：

- 只有一套业务实现
- UI 体验自然
- CLI 保留且不分叉
- 后续能继续扩展网页授权和设备管理

缺点：

- 需要补一层宿主 API

结论：推荐，并作为本方案唯一建议。

## 4. 总体架构

这次产品化后的分层应该固定为：

```text
packages/nextclaw-ui
  -> Remote Access Page
  -> useRemoteAccess hooks / api client

packages/nextclaw-server
  -> local UI routes: /api/remote/*
  -> remote host controller

packages/nextclaw
  -> remote host actions
  -> service/config/runtime adapters

packages/nextclaw-remote
  -> connector / relay / device register / service module
```

关键原则：

- UI 不直接读写本地配置文件
- UI 不直接碰 `service.json`
- UI 不直接 import `@nextclaw/remote`
- `@nextclaw/remote` 不知道 UI 的存在

也就是说，UI 只调用本地 API；本地 API 再调用 `nextclaw` 宿主动作；宿主动作再复用 `@nextclaw/remote` runtime。

## 5. 页面方案

建议在现有配置体系中新增一个独立页面或独立配置卡片，名称直接叫：

- 中文：`远程访问`
- 英文：`Remote Access`

我更推荐做成独立页面，而不是塞进现有 `RuntimeConfig` 的一个小块。原因很简单：

- 它有完整的状态面板
- 它有账户动作
- 它有服务动作
- 它有诊断输出

塞进一个已有配置表单里会让信息密度过高，后续也不利于继续扩展。

### 页面结构

#### 5.1 顶部摘要卡

显示：

- 当前状态：`未启用 / 已启用但未连接 / 已连接 / 错误`
- 当前设备名
- 平台地址
- 最近连接时间
- 当前本地服务状态

目标是用户一进来就知道：

- 我到底有没有开
- 现在能不能被远程访问

#### 5.2 账户区

显示：

- 当前登录邮箱
- 当前角色
- token 是否已配置

动作：

- 登录
- 退出登录
- 刷新账户信息

MVP 阶段仍可先保留邮箱密码登录表单，但必须把它做进 UI。

后续升级方向：

- “在浏览器中授权”按钮
- 回跳本地 UI 完成登录

#### 5.3 远程访问设置区

显示与编辑：

- 启用 remote access
- 设备名
- 平台 API Base
- 自动重连开关

动作：

- 保存并启用
- 禁用 remote access

#### 5.4 服务区

显示：

- 本地服务是否运行
- UI 端口
- 当前 remote runtime mode

动作：

- 启动服务
- 重启服务
- 停止服务

这里的核心不是把 service 页面复制一遍，而是只保留 remote 用户真正需要的最小服务动作。

#### 5.5 诊断区

展示结构化检查项：

- 平台 token
- 平台 API base
- 本地 UI health
- managed service runtime
- remote connector status

每一项都要有：

- pass / warn / fail
- 说明文本
- 建议动作

## 6. 宿主 API 设计

为了避免 UI 和 CLI 各做一套逻辑，建议在本地 UI server 增加一组 `remote host` API。

### 6.1 查询类

```text
GET /api/remote/status
GET /api/remote/doctor
GET /api/remote/account
```

用途：

- 页面初始化
- 轮询或手动刷新
- 渲染摘要卡和诊断区

### 6.2 动作类

```text
POST /api/remote/login
POST /api/remote/logout
POST /api/remote/enable
POST /api/remote/disable
POST /api/remote/service/start
POST /api/remote/service/restart
POST /api/remote/service/stop
```

### 6.3 数据更新类

```text
PUT /api/remote/settings
```

用于更新：

- deviceName
- platformApiBase
- autoReconnect

### 6.4 返回模型

建议统一返回：

```ts
type RemoteAccessView = {
  account: {
    loggedIn: boolean;
    email?: string;
    role?: string;
  };
  config: {
    enabled: boolean;
    deviceName: string;
    platformApiBase: string;
    autoReconnect: boolean;
  };
  runtime: {
    state: "disabled" | "connecting" | "connected" | "disconnected" | "error";
    mode?: "service" | "foreground";
    deviceId?: string;
    localOrigin?: string;
    lastConnectedAt?: string | null;
    lastError?: string | null;
  } | null;
  service: {
    running: boolean;
    uiUrl?: string | null;
    uiPort?: number | null;
  };
};
```

这样 UI 不需要自己拼装多个来源的状态。

## 7. 宿主动作抽象

在 `nextclaw` 主包里，建议把当前 CLI 命令类继续往下收敛一层，形成统一的宿主动作，例如：

- `getRemoteAccessView()`
- `loginToPlatform()`
- `logoutFromPlatform()`
- `enableRemoteAccess()`
- `disableRemoteAccess()`
- `updateRemoteSettings()`
- `startManagedService()`
- `restartManagedService()`
- `stopManagedService()`
- `runRemoteDoctor()`

原则：

- CLI 调这些动作
- 本地 `/api/remote/*` 也调这些动作

这样可以保证：

- 只有一个行为源
- 不会出现 CLI 正常、UI 不正常
- 不会出现 UI 修改配置和 CLI 修改配置走两套逻辑

## 8. 登录形态设计

### 8.1 MVP

先做 UI 内邮箱密码登录。

理由：

- 现有平台已经支持这条链路
- 实现成本低
- 能马上去掉“用户必须命令行登录”的障碍

### 8.2 下一阶段

再升级为网页授权登录。

推荐形态：

1. UI 中点击“前往平台授权”
2. 打开浏览器平台登录页
3. 平台登录成功后回跳本地 callback
4. 本地写入 token

这一步更产品化，但不应该阻塞当前 UI 化。

## 9. 前端交互原则

### 9.1 不做纯表单

这个页面不是传统配置表单，而是“状态 + 动作”页面。

所以布局应该更像：

- 状态卡
- 操作按钮
- 诊断清单
- 少量必要表单项

### 9.2 异步反馈必须可见

像这些动作都必须有明确状态反馈：

- 登录中
- 保存中
- 重启服务中
- 正在连接
- 已连接
- 最近错误

### 9.3 错误提示不能只有原始报错

需要同时给：

- 原始错误
- 用户可理解说明
- 推荐动作

例如：

- `token missing`
- 页面文案：`你还没有登录平台`
- 推荐动作：`先完成平台登录`

## 10. 与现有配置 UI 的关系

我不建议把 remote access 混进已有 `RuntimeConfig` 的通用运行时配置块中。长期更合理的是：

- `Runtime` 继续负责模型/上下文/运行策略
- `Remote Access` 作为独立页负责远程接入能力

二者关系是：

- 共用配置体系
- 不共用页面职责

这会让信息架构更干净，也更符合用户认知。

## 11. 分阶段落地

### Phase 1：UI 只读状态页

交付：

- `/api/remote/status`
- `/api/remote/doctor`
- UI “远程访问”页面
- 状态摘要 + 诊断区

价值：

- 先让用户知道 remote 现在是什么状态
- 风险最小

### Phase 2：UI 可写设置与服务动作

交付：

- `/api/remote/enable`
- `/api/remote/disable`
- `/api/remote/service/*`
- 设置区与服务区

价值：

- 用户可以不进终端完成启用/禁用/启动/重启

### Phase 3：UI 登录

交付：

- `/api/remote/login`
- `/api/remote/logout`
- 账户区

价值：

- 真正去掉 CLI 前置依赖

### Phase 4：网页授权登录

交付：

- 平台授权跳转
- 本地 callback
- 登录成功回流

价值：

- 进一步产品化
- 去掉密码输入心智负担

## 12. 验收标准

满足以下条件，才算 UI 产品化 MVP 达成：

1. 用户可以完全不打开终端，在 UI 内完成 remote 登录、启用、启动服务。
2. `nextclaw remote` CLI 和 UI 仍然共用同一套宿主逻辑。
3. 页面能清楚显示当前 remote 状态与错误原因。
4. 远程访问功能没有引入第二套 runtime 或第二套 service 状态。
5. 后续网页授权登录可以在不推翻当前结构的情况下增量接入。

## 13. 我的推荐

下一步最值得做的，不是先去补 OAuth，而是先做：

1. `nextclaw` 主包里的 `remote host actions`
2. `nextclaw-server` 的 `/api/remote/*`
3. `nextclaw-ui` 的独立“远程访问”页面

这是当前最轻、最稳、长期又正确的路径。

它能在不复制功能的前提下，把 remote access 从“开发者命令”升级为“普通用户可用的产品能力”。
