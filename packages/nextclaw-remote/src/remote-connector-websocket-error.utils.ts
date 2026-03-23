export function readRemoteConnectorSocketErrorMessage(event: Event): string {
  const typedEvent = event as unknown as { message?: unknown; error?: unknown };
  if (typeof typedEvent.message === "string") {
    const directMessage = typedEvent.message.trim();
    if (directMessage.length > 0) {
      return directMessage;
    }
  }
  const nestedError = typedEvent.error;
  if (nestedError instanceof Error && nestedError.message.trim().length > 0) {
    return nestedError.message.trim();
  }
  if (typeof nestedError === "string" && nestedError.trim().length > 0) {
    return nestedError.trim();
  }
  if (
    typeof nestedError === "object"
    && nestedError
    && typeof (nestedError as { message?: unknown }).message === "string"
  ) {
    const nestedMessage = (nestedError as { message: string }).message.trim();
    if (nestedMessage.length > 0) {
      return nestedMessage;
    }
  }
  return "Remote connector websocket failed.";
}
