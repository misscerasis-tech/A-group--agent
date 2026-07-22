import type {
  FeishuConnectionConfig,
  FeishuMigrationPlan,
  PublicFeishuConnectionConfig,
} from "./types";

function assertSameWorkspace(
  currentConnection: FeishuConnectionConfig,
  nextConnection: FeishuConnectionConfig,
) {
  if (currentConnection.workspaceId !== nextConnection.workspaceId) {
    throw new Error("飞书连接迁移必须发生在同一个 Workspace 内。");
  }
}

function assertMigratable(connection: FeishuConnectionConfig, label: string) {
  if (connection.status === "failed") {
    throw new Error(`${label}飞书连接处于失败状态，不能作为迁移对象。`);
  }

  if (connection.status === "disabled" && label === "新") {
    throw new Error("新飞书连接已停用，不能迁移到该连接。");
  }
}

function preview(value: string) {
  if (value.length <= 8) {
    return "****";
  }

  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

export function toPublicFeishuConnectionConfig(
  connection: FeishuConnectionConfig,
): PublicFeishuConnectionConfig {
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    displayName: connection.displayName,
    status: connection.status,
    createdAt: connection.createdAt,
    updatedAt: connection.updatedAt,
    lastTestedAt: connection.lastTestedAt,
    appIdPreview: preview(connection.appId),
    tenantKeyPreview: preview(connection.tenantKey),
    defaultChatIdPreview: preview(connection.defaultChatId),
    resultDocumentIdPreview: connection.resultDocumentId
      ? preview(connection.resultDocumentId)
      : undefined,
    resultBitableIdPreview: connection.resultBitableId
      ? preview(connection.resultBitableId)
      : undefined,
  };
}

export function createFeishuMigrationPlan({
  currentConnection,
  nextConnection,
  reason,
  initiatedBy,
  now = new Date(),
}: {
  currentConnection: FeishuConnectionConfig;
  nextConnection: FeishuConnectionConfig;
  reason: string;
  initiatedBy: string;
  now?: Date;
}): FeishuMigrationPlan {
  assertSameWorkspace(currentConnection, nextConnection);
  assertMigratable(currentConnection, "当前");
  assertMigratable(nextConnection, "新");

  if (currentConnection.id === nextConnection.id) {
    throw new Error("新旧飞书连接不能是同一个连接。");
  }

  if (!reason.trim()) {
    throw new Error("飞书连接迁移必须填写原因。");
  }

  return {
    workspaceId: currentConnection.workspaceId,
    fromConnectionId: currentConnection.id,
    toConnectionId: nextConnection.id,
    reason: reason.trim(),
    initiatedBy,
    status: "planned",
    checklist: [
      "测试新飞书机器人是否能发送消息。",
      "测试新飞书结果沉淀位置是否可写入。",
      "确认新连接只属于当前 Workspace。",
      "切换 active 连接前保留旧连接回滚入口。",
      "切换后发送一条迁移完成通知。",
    ],
    rollback: [
      "暂停新连接发送任务。",
      "将旧连接重新标记为 active。",
      "将新连接标记为 failed 或 disabled。",
      "保存 rollback 迁移记录。",
      "通知 Workspace 管理员重新检查机器人权限。",
    ],
    createdAt: now.toISOString(),
  };
}
