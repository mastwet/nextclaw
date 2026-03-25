import {
  listProviderSpecs,
  type Config,
  type InboundAttachment,
  type ProviderSpec,
} from "@nextclaw/core";
import { listBuiltinProviders } from "@nextclaw/runtime";
import type { NcpAgentRunInput, NcpMessage } from "@nextclaw/ncp";
import {
  ensureIsoTimestamp,
  extractAttachmentsFromNcpMessage,
  extractTextFromNcpMessage,
} from "./nextclaw-ncp-message-bridge.js";

function normalizeModelId(value: string | undefined | null): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function normalizeConfiguredProviderModel(providerName: string, model: string): string {
  const trimmed = model.trim();
  if (!trimmed) {
    return "";
  }
  return trimmed.includes("/") ? trimmed : `${providerName}/${trimmed}`;
}

function modelMatchesCandidate(model: string, candidate: string): boolean {
  const normalizedModel = normalizeModelId(model);
  const normalizedCandidate = normalizeModelId(candidate);
  return (
    normalizedModel === normalizedCandidate ||
    normalizedModel.endsWith(`/${normalizedCandidate}`) ||
    normalizedCandidate.endsWith(`/${normalizedModel}`)
  );
}

function isImageCapableModel(model: string, providerSpecs: ProviderSpec[]): boolean {
  return providerSpecs.some((spec) =>
    (spec.visionModels ?? []).some((candidate) => modelMatchesCandidate(model, candidate)),
  );
}

function isProviderUsableForVision(config: Config, providerName: string): boolean {
  const provider = config.providers[providerName];
  if (!provider || provider.enabled === false) {
    return false;
  }
  if (typeof provider.apiKey === "string" && provider.apiKey.trim().length > 0) {
    return true;
  }
  return typeof provider.apiBase === "string" && provider.apiBase.trim().length > 0;
}

function resolveVisionProviderSpecs(): ProviderSpec[] {
  const registeredSpecs = listProviderSpecs();
  return registeredSpecs.length > 0 ? registeredSpecs : listBuiltinProviders();
}

function resolveImageTurnModel(params: {
  config: Config;
  currentModel: string;
}): string | null {
  const providerSpecs = resolveVisionProviderSpecs();
  if (isImageCapableModel(params.currentModel, providerSpecs)) {
    return params.currentModel;
  }

  for (const spec of providerSpecs) {
    const visionModels = spec.visionModels ?? [];
    if (visionModels.length === 0 || !isProviderUsableForVision(params.config, spec.name)) {
      continue;
    }

    const configuredModels = new Set(
      (params.config.providers[spec.name]?.models ?? [])
        .map((model) => normalizeConfiguredProviderModel(spec.name, model))
        .filter(Boolean)
        .map((model) => normalizeModelId(model)),
    );

    for (const visionModel of visionModels) {
      if (configuredModels.size > 0 && !configuredModels.has(normalizeModelId(visionModel))) {
        continue;
      }
      return visionModel;
    }
  }

  return null;
}

export function findLatestUserMessage(input: NcpAgentRunInput): NcpMessage | undefined {
  return (
    input.messages
      .slice()
      .reverse()
      .find((message) => message.role === "user") ??
    input.messages[input.messages.length - 1]
  );
}

export function buildCurrentTurnState(params: {
  input: NcpAgentRunInput;
  currentModel: string;
  config: Config;
  formatPrompt: (params: { text: string; timestamp: Date }) => string;
}): {
  currentMessage: string;
  currentAttachments: InboundAttachment[];
  effectiveModel: string;
} {
  const latestUserMessage = findLatestUserMessage(params.input);
  const currentAttachments = extractAttachmentsFromNcpMessage(latestUserMessage);
  const currentMessage = params.formatPrompt({
    text: extractTextFromNcpMessage(latestUserMessage),
    timestamp: new Date(
      ensureIsoTimestamp(
        latestUserMessage?.timestamp,
        new Date().toISOString(),
      ),
    ),
  });
  const imageTurnModel =
    currentAttachments.length > 0
      ? resolveImageTurnModel({
          config: params.config,
          currentModel: params.currentModel,
        })
      : null;

  return {
    currentMessage,
    currentAttachments,
    effectiveModel: imageTurnModel ?? params.currentModel,
  };
}
