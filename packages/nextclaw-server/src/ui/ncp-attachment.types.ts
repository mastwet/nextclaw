export type UiNcpStoredAttachmentRecord = {
  id: string;
  uri: string;
  storageKey: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  sha256: string;
};

export type UiNcpAttachmentView = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  attachmentUri: string;
  url: string;
};

export type UiNcpAttachmentUploadView = {
  attachments: UiNcpAttachmentView[];
};
