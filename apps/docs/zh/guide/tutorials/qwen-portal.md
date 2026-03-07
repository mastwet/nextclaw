# Qwen Portal 免费配置教程（小白版）

如果你想先用一个**免费、开箱即用**的模型提供商跑通 NextClaw，`Qwen Portal` 是目前最适合小白的方案之一。

> 注意：你不需要预先拥有单独的 Qwen 账号。打开 `chat.qwen.ai` 后，可按页面提供的方式直接注册或登录（例如邮箱、Google、GitHub 等）；如果 Qwen 官方后续调整入口，请以页面实际显示为准。

本教程会带你完成这 4 件事：

1. 打开 NextClaw 的 Provider 配置页
2. 用浏览器完成 Qwen 授权
3. 在 NextClaw 中启用 `qwen-portal`
4. 发起一条真实消息确认已经可用

## 前置条件

- 你已经安装并可以打开 NextClaw。
- 你的电脑可以正常访问 `chat.qwen.ai`。
- 你可以正常访问 `chat.qwen.ai`，并按页面提供的任一方式完成注册或登录。

如果你是通过 CLI 使用 NextClaw，可以先启动本地 UI：

```bash
nextclaw start --ui-port 18891
```

然后在浏览器打开：

- `http://127.0.0.1:18891`

## 1）打开 Providers 页面

进入 NextClaw 后：

1. 打开 `Providers` 页面。
2. 在提供商列表中找到 `Qwen Portal`。
3. 点击进入它的配置卡片。

你会看到这个 Provider 自带授权区，不需要你手动去找第三方 API Key。

## 2）点击“浏览器授权”

在 `Qwen Portal` 配置卡里：

1. 点击 `浏览器授权`。
2. NextClaw 会打开浏览器，并跳到 Qwen 的授权页面。
3. 按页面提示登录并完成授权确认。

正常情况下：

- 你不需要手动填写 API Key。
- 授权成功后，NextClaw 会自动保存凭证。
- `apiBase` 也会自动使用默认值：`https://portal.qwen.ai/v1`。

## 3）返回 NextClaw，等待授权完成

完成浏览器操作后，回到 NextClaw：

1. 保持当前 `Qwen Portal` 页面打开。
2. 等待界面提示 `授权已完成`。
3. 确认该 Provider 状态变成已配置。

如果你已经在本机登录过 Qwen CLI，也可以直接点击：

- `从 Qwen CLI 导入`

这会尝试从本机的 `~/.qwen/oauth_creds.json` 导入授权信息，适合已经用过 Qwen CLI 的用户。

## 4）选择模型并发起一次测试消息

完成授权后，建议直接做一次最小验证：

1. 进入对话页面。
2. 在模型选择里选择 `qwen-portal/coder-model`。
3. 发送下面这句话：

```text
请只回复：QWEN-PORTAL-OK
```

预期结果：

- 模型正常返回 `QWEN-PORTAL-OK`，或返回含义一致的简短文本。

如果你想先做更稳的测试，也可以试：

```text
只回复数字：1+1=
```

预期结果：

- 返回 `2`

## 适合谁用

`Qwen Portal` 特别适合这几类用户：

- 第一次接触 NextClaw，不想先研究 API 平台。
- 想快速验证聊天、工具、工作流是否可跑通。
- 想先免费试用，再决定是否切换到其它 provider。

## 常见问题

### 为什么我没看到 `Qwen Portal`？

- 先确认你使用的是包含 `qwen-portal` 内置 provider 的版本。
- 如果是旧版本，请先升级 NextClaw。

### 浏览器已经登录了，但 NextClaw 一直没显示成功

- 先在原页面等待几秒，授权结果需要一点轮询时间。
- 不要立刻关闭 `Qwen Portal` 配置页。
- 如果仍未成功，可重新点击一次 `浏览器授权`。

### 我需要自己填写 `API Key` 吗？

- 一般不需要。
- 按本教程走完浏览器授权后，NextClaw 会自动写入凭证。

### 我需要自己填写 `API Base` 吗？

- 一般不需要。
- 默认就是：`https://portal.qwen.ai/v1`

### `从 Qwen CLI 导入` 是干什么的？

- 如果你已经用 Qwen CLI 登录过，NextClaw 可以直接复用那份本机凭证。
- 如果你从没装过 Qwen CLI，忽略这个按钮即可，直接用“浏览器授权”就行。

## 相关文档

- [教程总览](/zh/guide/tutorials)
- [配置](/zh/guide/configuration)
- [模型选型指南](/zh/guide/model-selection)
- [故障排查](/zh/guide/troubleshooting)
