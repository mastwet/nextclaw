import type { NcpMessagePart } from "@nextclaw/ncp";

export function MessagePart({ part }: { part: NcpMessagePart }) {
  if (part.type === "text") {
    return <p className="part-text">{part.text}</p>;
  }

  if (part.type === "reasoning") {
    return (
      <div className="part-reasoning-block">
        <div className="part-reasoning-label">thinking</div>
        <pre className="part-reasoning-text">{part.text}</pre>
      </div>
    );
  }

  if (part.type === "tool-invocation") {
    return (
      <div className="part-tool">
        <div>tool: {part.toolName}</div>
        <pre>{JSON.stringify({ args: part.args, result: part.result }, null, 2)}</pre>
      </div>
    );
  }

  if (part.type === "file" && (part.contentBase64 || part.url)) {
    const dataUrl =
      part.url?.trim() ||
      `data:${part.mimeType ?? "application/octet-stream"};base64,${part.contentBase64 ?? ""}`;
    const isImage = (part.mimeType ?? "").startsWith("image/");
    if (isImage) {
      return (
        <img
          className="part-file-image"
          src={dataUrl}
          alt={part.name ?? "attachment"}
        />
      );
    }

    return (
      <a
        className="part-file"
        href={dataUrl}
        download={part.name ?? "attachment"}
        target="_blank"
        rel="noreferrer"
      >
        <div className="part-file-meta">
          <div>{part.name ?? "attachment"}</div>
          <div className="ncp-ui-muted">{part.mimeType ?? "application/octet-stream"}</div>
        </div>
      </a>
    );
  }

  return <pre className="part-raw">{JSON.stringify(part, null, 2)}</pre>;
}
