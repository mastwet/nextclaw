import { useEffect, useRef, useState } from "react";
import { NcpHttpAgentClientEndpoint } from "@nextclaw/ncp-http-agent-client";
import {
  buildNcpRequestEnvelope,
  DEFAULT_NCP_ATTACHMENT_MAX_BYTES,
  uploadFilesAsNcpDraftAttachments,
  useHydratedNcpAgent,
  type NcpDraftAttachment,
} from "@nextclaw/ncp-react";
import { ChatHeader, ChatInput, ErrorBox, MessageList } from "@nextclaw/ncp-react-ui";
import { loadConversationSeed } from "../lib/session";

type ChatPanelProps = {
  sessionId: string;
  onRefresh: () => void;
};

async function uploadDemoAttachments(files: File[]): Promise<NcpDraftAttachment[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/ncp/assets", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json() as {
    ok: boolean;
    data?: {
      assets: Array<{
        id: string;
        name: string;
        mimeType: string;
        sizeBytes: number;
        assetUri: string;
        url: string;
      }>;
    };
    error?: {
      message?: string;
    };
  };
  if (!response.ok || !payload.ok || !payload.data) {
    throw new Error(payload.error?.message || "Failed to put assets.");
  }

  return payload.data.assets.map((asset) => ({
    id: asset.id,
    name: asset.name,
    mimeType: asset.mimeType,
    sizeBytes: asset.sizeBytes,
    assetUri: asset.assetUri,
    url: asset.url,
  }));
}

export function ChatPanel({ sessionId, onRefresh }: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<NcpDraftAttachment[]>([]);
  const [composerError, setComposerError] = useState<string | null>(null);
  const ncpClientRef = useRef<NcpHttpAgentClientEndpoint>();
  if (!ncpClientRef.current) {
    ncpClientRef.current = new NcpHttpAgentClientEndpoint({
      baseUrl: window.location.origin,
    });
  }
  const agent = useHydratedNcpAgent({
    sessionId,
    client: ncpClientRef.current,
    loadSeed: loadConversationSeed,
  });

  useEffect(() => {
    setDraft("");
    setAttachments([]);
    setComposerError(null);
  }, [sessionId]);

  const handleSend = async () => {
    const envelope = buildNcpRequestEnvelope({
      sessionId,
      text: draft,
      attachments,
    });
    if (!envelope || agent.isSending || agent.isRunning) return;
    const prevDraft = draft;
    const prevAttachments = attachments;
    setDraft("");
    setAttachments([]);
    setComposerError(null);
    try {
      await agent.send(envelope);
    } catch (error) {
      setDraft(prevDraft);
      setAttachments(prevAttachments);
      throw error;
    }
    onRefresh();
  };

  const handleAbort = async () => {
    await agent.abort();
    onRefresh();
  };

  const handleFilesAdd = async (files: File[]) => {
    const result = await uploadFilesAsNcpDraftAttachments(files, {
      uploadBatch: uploadDemoAttachments,
    });
    if (result.attachments.length > 0) {
      setAttachments((current) => {
        const seen = new Set<string>();
        const next = [...current, ...result.attachments].filter((attachment) => {
          const signature = [
            attachment.assetUri ?? "",
            attachment.url ?? "",
            attachment.name,
            attachment.mimeType,
            String(attachment.sizeBytes),
            attachment.contentBase64 ?? "",
          ].join(":");
          if (seen.has(signature)) {
            return false;
          }
          seen.add(signature);
          return true;
        });
        return next;
      });
      setComposerError(null);
    }
    if (result.rejected.length > 0) {
      const first = result.rejected[0];
      if (first.reason === "unsupported-type") {
        setComposerError("This file type is not supported in the current upload flow.");
      } else if (first.reason === "too-large") {
        setComposerError(
          `Files must be ${DEFAULT_NCP_ATTACHMENT_MAX_BYTES / (1024 * 1024)} MB or smaller.`,
        );
      } else {
        setComposerError("Failed to read the file. Please try again.");
      }
    }
  };

  return (
    <main className="panel chat-panel">
      <ChatHeader
        title="NCP Agent Demo"
        streamRunDisabled={!agent.isRunning}
        abortDisabled={!agent.isRunning}
        onStreamRun={agent.streamRun}
        onAbort={handleAbort}
      />
      <MessageList
        messages={agent.visibleMessages}
        emptyMessage={agent.isHydrating ? "Loading session..." : "Send a message to start."}
      />
      <ErrorBox
        error={
          composerError
            ? {
                code: "runtime-error",
                message: composerError,
              }
            : agent.hydrateError
              ? {
                  code: "runtime-error",
                  message: agent.hydrateError.message,
                }
              : (agent.snapshot.error ?? null)
        }
      />
      <ChatInput
        value={draft}
        attachments={attachments}
        placeholder="Ask for the time, or ask the agent to sleep for 2 seconds."
        isSending={agent.isSending}
        sendDisabled={agent.isSending || agent.isRunning || agent.isHydrating}
        isRunning={agent.isRunning}
        onChange={setDraft}
        onFilesAdd={handleFilesAdd}
        onAttachmentRemove={(attachmentId) => {
          setAttachments((current) => current.filter((attachment) => attachment.id !== attachmentId));
        }}
        onSend={handleSend}
        onAbort={handleAbort}
      />
    </main>
  );
}
