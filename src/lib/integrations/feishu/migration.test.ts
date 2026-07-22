import { describe, expect, it } from "vitest";
import {
  createFeishuMigrationPlan,
  toPublicFeishuConnectionConfig,
} from "./migration";
import type { FeishuConnectionConfig } from "./types";

const currentConnection: FeishuConnectionConfig = {
  id: "feishu-old",
  workspaceId: "workspace-1",
  displayName: "旧飞书机器人",
  appId: "cli_a1234567890",
  tenantKey: "tenant_old_123456",
  defaultChatId: "oc_old_chat_123456",
  resultDocumentId: "doc_old_123456",
  status: "active",
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
  lastTestedAt: "2026-07-10T00:00:00.000Z",
};

const nextConnection: FeishuConnectionConfig = {
  id: "feishu-new",
  workspaceId: "workspace-1",
  displayName: "新飞书机器人",
  appId: "cli_b1234567890",
  tenantKey: "tenant_new_123456",
  defaultChatId: "oc_new_chat_123456",
  resultDocumentId: "doc_new_123456",
  status: "testing",
  createdAt: "2026-07-20T00:00:00.000Z",
  updatedAt: "2026-07-20T00:00:00.000Z",
};

describe("feishu migration", () => {
  it("creates a migration plan with rollback steps", () => {
    const plan = createFeishuMigrationPlan({
      currentConnection,
      nextConnection,
      reason: "比赛演示迁移到正式机器人",
      initiatedBy: "demo@example.com",
      now: new Date("2026-07-22T00:00:00.000Z"),
    });

    expect(plan.workspaceId).toBe("workspace-1");
    expect(plan.fromConnectionId).toBe("feishu-old");
    expect(plan.toConnectionId).toBe("feishu-new");
    expect(plan.checklist.length).toBeGreaterThan(3);
    expect(plan.rollback.some((step) => step.includes("旧连接"))).toBe(true);
  });

  it("rejects cross-workspace migration", () => {
    expect(() =>
      createFeishuMigrationPlan({
        currentConnection,
        nextConnection: {
          ...nextConnection,
          workspaceId: "workspace-2",
        },
        reason: "跨 Workspace 测试",
        initiatedBy: "demo@example.com",
      }),
    ).toThrow("同一个 Workspace");
  });

  it("redacts identifiers before exposing config", () => {
    const publicConfig = toPublicFeishuConnectionConfig(currentConnection);

    expect(publicConfig.appIdPreview).toBe("cli_...7890");
    expect("appId" in publicConfig).toBe(false);
    expect("defaultChatId" in publicConfig).toBe(false);
  });
});
