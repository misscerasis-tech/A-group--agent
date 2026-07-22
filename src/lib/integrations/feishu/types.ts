export type FeishuConnectionStatus =
  | "draft"
  | "testing"
  | "active"
  | "disabled"
  | "migrated"
  | "failed";

export type FeishuConnectionConfig = {
  id: string;
  workspaceId: string;
  displayName: string;
  appId: string;
  tenantKey: string;
  defaultChatId: string;
  resultDocumentId?: string;
  resultBitableId?: string;
  status: FeishuConnectionStatus;
  createdAt: string;
  updatedAt: string;
  lastTestedAt?: string;
};

export type FeishuSecretRef = {
  appSecretEnv: string;
  encryptKeyEnv?: string;
  verificationTokenEnv?: string;
};

export type FeishuMigrationStatus =
  | "planned"
  | "tested"
  | "switched"
  | "rolled_back"
  | "failed";

export type FeishuMigrationPlan = {
  workspaceId: string;
  fromConnectionId: string;
  toConnectionId: string;
  reason: string;
  initiatedBy: string;
  status: FeishuMigrationStatus;
  checklist: string[];
  rollback: string[];
  createdAt: string;
};

export type PublicFeishuConnectionConfig = Omit<
  FeishuConnectionConfig,
  "appId" | "tenantKey" | "defaultChatId" | "resultDocumentId" | "resultBitableId"
> & {
  appIdPreview: string;
  tenantKeyPreview: string;
  defaultChatIdPreview: string;
  resultDocumentIdPreview?: string;
  resultBitableIdPreview?: string;
};
