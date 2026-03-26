import { resolve } from "node:path";
import {
  buildAssetContentPath,
  type LocalAssetStore,
  type StoredAssetRecord,
} from "@nextclaw/ncp-agent-runtime";
import type { NcpTool } from "@nextclaw/ncp";

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalBase64Bytes(value: unknown): Uint8Array | null {
  const base64 = readOptionalString(value);
  if (!base64) {
    return null;
  }
  try {
    return Buffer.from(base64, "base64");
  } catch {
    return null;
  }
}

function toAssetPayload(record: StoredAssetRecord, contentBasePath: string) {
  return {
    uri: record.uri,
    name: record.fileName,
    mimeType: record.mimeType,
    sizeBytes: record.sizeBytes,
    createdAt: record.createdAt,
    url: buildAssetContentPath({
      basePath: contentBasePath,
      assetUri: record.uri,
    }),
  };
}

class AssetPutTool implements NcpTool {
  readonly name = "asset_put";
  readonly description =
    "Put a normal file path or base64 bytes into the managed asset store.";
  readonly parameters = {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "Existing local file path to put into the asset store.",
      },
      bytesBase64: {
        type: "string",
        description: "Base64 file bytes. Use together with fileName when no source path exists.",
      },
      fileName: {
        type: "string",
        description: "Optional asset file name override. Required when using bytesBase64.",
      },
      mimeType: {
        type: "string",
        description: "Optional mime type override.",
      },
    },
  };

  constructor(
    private readonly assetStore: LocalAssetStore,
    private readonly contentBasePath: string,
  ) {}

  async execute(args: unknown): Promise<unknown> {
    const path = readOptionalString((args as { path?: unknown } | null)?.path);
    const fileName = readOptionalString((args as { fileName?: unknown } | null)?.fileName);
    const mimeType = readOptionalString((args as { mimeType?: unknown } | null)?.mimeType);
    const bytes = readOptionalBase64Bytes((args as { bytesBase64?: unknown } | null)?.bytesBase64);

    let record: StoredAssetRecord;
    if (path) {
      record = await this.assetStore.putPath({
        path,
        fileName: fileName ?? undefined,
        mimeType,
      });
    } else if (bytes && fileName) {
      record = await this.assetStore.putBytes({
        fileName,
        mimeType,
        bytes,
      });
    } else {
      throw new Error("asset_put requires either path, or bytesBase64 + fileName.");
    }

    return {
      ok: true,
      asset: toAssetPayload(record, this.contentBasePath),
    };
  }
}

class AssetExportTool implements NcpTool {
  readonly name = "asset_export";
  readonly description =
    "Export a managed asset to a normal file path so it can be processed like any ordinary file.";
  readonly parameters = {
    type: "object",
    properties: {
      assetUri: {
        type: "string",
        description: "Managed asset URI to export.",
      },
      targetPath: {
        type: "string",
        description: "Destination file path.",
      },
    },
    required: ["assetUri", "targetPath"],
  };

  constructor(private readonly assetStore: LocalAssetStore) {}

  async execute(args: unknown): Promise<unknown> {
    const assetUri = readOptionalString((args as { assetUri?: unknown } | null)?.assetUri);
    const targetPath = readOptionalString((args as { targetPath?: unknown } | null)?.targetPath);
    if (!assetUri || !targetPath) {
      throw new Error("asset_export requires assetUri and targetPath.");
    }
    const exportedPath = await this.assetStore.export({ uri: assetUri }, resolve(targetPath));
    return {
      ok: true,
      assetUri,
      exportedPath,
    };
  }
}

class AssetStatTool implements NcpTool {
  readonly name = "asset_stat";
  readonly description = "Read managed asset metadata.";
  readonly parameters = {
    type: "object",
    properties: {
      assetUri: {
        type: "string",
        description: "Managed asset URI to inspect.",
      },
    },
    required: ["assetUri"],
  };

  constructor(
    private readonly assetStore: LocalAssetStore,
    private readonly contentBasePath: string,
  ) {}

  async execute(args: unknown): Promise<unknown> {
    const assetUri = readOptionalString((args as { assetUri?: unknown } | null)?.assetUri);
    if (!assetUri) {
      throw new Error("asset_stat requires assetUri.");
    }
    const record = await this.assetStore.statRecord(assetUri);
    if (!record) {
      return {
        ok: false,
        error: {
          code: "not_found",
          message: `Asset not found: ${assetUri}`,
        },
      };
    }
    return {
      ok: true,
      asset: toAssetPayload(record, this.contentBasePath),
    };
  }
}

export function createAssetTools(params: {
  assetStore: LocalAssetStore;
  contentBasePath?: string;
}): NcpTool[] {
  const contentBasePath = params.contentBasePath ?? "/api/ncp/assets/content";
  return [
    new AssetPutTool(params.assetStore, contentBasePath),
    new AssetExportTool(params.assetStore),
    new AssetStatTool(params.assetStore, contentBasePath),
  ];
}
