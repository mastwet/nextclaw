# Chat Attachment Service Design

## Goal

为 NextClaw/NCP 聊天建立一个通用、轻量、可扩展的附件基础设施：

- 前端上传文件后不再把完整 base64 长期保存在 composer 状态中
- 服务端负责保存附件并返回稳定引用
- 消息层只传附件引用与展示所需元数据
- 运行时在送模型前按附件类型决定如何摄取
- 图片继续支持多模态，`json/txt/md/csv/xml/源码` 等 text-like 文件真正进入模型上下文

## Why

当前实现有两个根问题：

1. 前端上传后主要依赖内存中的 base64，缺少稳定附件身份与可复用存储。
2. 运行时当前只识别图片附件，非图片即使成功发送，也不会被模型感知。

这会产生“UI 看起来支持上传，但模型实际没看到文件”的假支持。

## Recommendation

推荐采用“两层结构”：

1. 附件服务层
   - 负责保存、命名、读取、下载、元数据管理
   - 返回稳定 `attachmentUri`
2. 附件摄取层
   - 在运行时将附件转换成模型能理解的输入
   - 图片走多模态
   - text-like 文件走文本提取
   - 暂不支持的二进制文件显式不注入模型

## Alternatives Considered

### Option A: 继续前端内存 base64

- 优点：改动最小
- 缺点：消息膨胀、无法稳定引用、无法复用、无法形成统一附件服务

不采用。

### Option B: 上传后只保存 HTTP 下载地址

- 优点：前端简单
- 缺点：下载地址不是稳定身份；后续换存储、加鉴权、加索引时会耦合 URL 结构

不作为主方案。

### Option C: 附件服务 + 逻辑 URI

- 优点：身份与物理路径解耦；后续可切对象存储；运行时可按 URI 解析
- 缺点：比纯 base64 多一层服务

采用。

## Storage Layout

附件根目录：

```text
<data-root>/attachments/
```

本地存储布局：

```text
attachments/YYYY/MM/DD/<attachment-id>/meta.json
attachments/YYYY/MM/DD/<attachment-id>/<sanitized-original-name>
```

设计说明：

- 日期目录只用于物理分组，不作为业务身份的唯一来源
- 每个附件单独一个目录，因此无需通过“重名加后缀”解决冲突
- 原始文件名只用于展示和下载，不承担唯一性职责

## URI Design

逻辑 URI 采用：

```text
attachment://local/YYYY/MM/DD/<attachment-id>
```

设计说明：

- URI 代表逻辑身份，不等同于最终下载 URL
- `attachment-id` 为稳定随机 ID
- `YYYY/MM/DD` 只是 storage key 的一部分，便于本地落盘与清理

## Attachment Record

```ts
type AttachmentRecord = {
  id: string;
  uri: string;
  storageKey: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
}
```

前端草稿附件：

```ts
type NcpDraftAttachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  attachmentUri?: string;
  url?: string;
  contentBase64?: string;
}
```

说明：

- 本地上传后的主路径使用 `attachmentUri`
- `url` 用于 UI 展示、图片预览和文件下载
- `contentBase64` 仅保留给兼容路径和测试，不再作为主流上传形态
- `originalName` 用于用户可见展示，`storedName` 用于落盘文件名，两者职责分离

## API Surface

### Upload

```http
POST /api/ncp/attachments
Content-Type: multipart/form-data
```

响应：

```json
{
  "ok": true,
  "data": {
    "attachments": [
      {
        "id": "att_xxx",
        "name": "config.json",
        "mimeType": "application/json",
        "sizeBytes": 123,
        "attachmentUri": "attachment://local/2026/03/26/att_xxx",
        "url": "/api/ncp/attachments/content?uri=attachment%3A%2F%2Flocal%2F2026%2F03%2F26%2Fatt_xxx"
      }
    ]
  }
}
```

### Download / Preview

```http
GET /api/ncp/attachments/content?uri=<attachment-uri>
```

用途：

- 非图片文件下载
- 图片消息回显预览

## Message Contract

NCP `file` part 增加稳定引用：

```ts
type NcpFilePart = {
  type: "file";
  name?: string;
  mimeType?: string;
  url?: string;
  contentBase64?: string;
  attachmentUri?: string;
  sizeBytes?: number;
}
```

发送消息时：

- 已上传附件：优先发送 `attachmentUri + url`
- 兼容路径：允许 `contentBase64`

## Ingestion Strategy

### Images

- 若存在 `attachmentUri`，运行时读取本地附件并转成 data URL 送多模态
- 若只有外部 `url`，沿用原有 image URL 逻辑

### Text-like Files

第一批支持：

- `application/json`
- `text/*`
- `application/xml`
- `application/yaml`
- `text/yaml`
- `text/csv`
- 常见源码 MIME 或通过扩展名识别的源码文件

处理方式：

- 从附件服务读取原始字节
- 以 UTF-8 解码
- 超过阈值时截断并显式加上截断说明
- 注入模型上下文时使用明确边界：

```text
[Attachment: config.json]
[MIME: application/json]
{ ...content... }
```

### Unsupported Binary Files

当前 MVP 不自动注入：

- `pdf`
- `docx`
- `xlsx`
- `zip`
- 未识别二进制

行为：

- 允许上传与消息回显
- 默认不注入模型上下文
- 后续可演进为 OCR / 文档解析 / retrieval

这比“静默假支持”更可预测。

## Cursor Contract

文件 token 插入后，光标必须满足：

- 单文件插入：落在 token 后
- 连续文件插入：落在最后一个 token 后
- 插入后继续输入：文本出现在 token 后而不是 token 前

这需要在 composer controller 级别保证，不依赖浏览器当前 DOM 选择行为偶然正确。

## Validation Plan

1. 附件服务测试
   - 上传后生成稳定 URI
   - 能通过 URI 取回元数据与内容
2. 运行时测试
   - `json` 文件进入模型上下文
   - 图片仍生成多模态输入
3. 前端测试
   - 文件上传后 token 插入位置正确
   - 图片消息可预览
   - 非图片文件消息可下载
4. 类型检查
   - 受影响 packages 全量 `tsc`

## MVP Scope

本次实现只完成：

- 本地文件系统附件服务
- NextClaw UI NCP 路由与 NCP demo 上传/下载
- `attachmentUri` 契约
- text-like 文件注入模型上下文
- 光标位置修复

本次不完成：

- PDF / Office 文档解析
- 向量检索 / RAG
- 对象存储后端
- 附件 GC / 生命周期清理策略
