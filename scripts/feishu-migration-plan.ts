import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  createFeishuMigrationPlan,
  toPublicFeishuConnectionConfig,
} from "../src/lib/integrations/feishu/migration";
import type { FeishuConnectionConfig, FeishuConnectionStatus } from "../src/lib/integrations/feishu/types";

function loadLocalEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return false;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const rawValue = valueParts.join("=").trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    process.env[key.trim()] ??= value;
  }

  return true;
}

function envValue(name: string, fallback = "") {
  return process.env[name]?.trim() || fallback;
}

function statusValue(value: string, fallback: FeishuConnectionStatus): FeishuConnectionStatus {
  const normalized = value.trim() as FeishuConnectionStatus;
  const statuses: FeishuConnectionStatus[] = ["draft", "testing", "active", "disabled", "migrated", "failed"];

  return statuses.includes(normalized) ? normalized : fallback;
}

function buildConnection(prefix: "CURRENT" | "NEXT", now: string): FeishuConnectionConfig | null {
  const envPrefix = prefix === "CURRENT" ? "FEISHU" : "FEISHU_NEXT";
  const appId = envValue(`${envPrefix}_APP_ID`);

  if (!appId) {
    return null;
  }

  return {
    id: envValue(
      `${envPrefix}_CONNECTION_ID`,
      prefix === "CURRENT" ? "feishu-current" : "feishu-next",
    ),
    workspaceId: envValue("FEISHU_WORKSPACE_ID", "local-a-group-workspace"),
    displayName: envValue(
      `${envPrefix}_CONNECTION_NAME`,
      prefix === "CURRENT" ? "当前飞书机器人" : "新飞书机器人",
    ),
    appId,
    tenantKey: envValue(`${envPrefix}_TENANT_KEY`, `${envPrefix.toLowerCase()}_tenant_key_not_recorded`),
    defaultChatId: envValue(`${envPrefix}_DEFAULT_CHAT_ID`, `${envPrefix.toLowerCase()}_chat_id_not_recorded`),
    resultDocumentId: envValue(`${envPrefix}_RESULT_DOCUMENT_ID`) || undefined,
    resultBitableId: envValue(`${envPrefix}_RESULT_BITABLE_ID`) || undefined,
    status: statusValue(
      envValue(`${envPrefix}_CONNECTION_STATUS`),
      prefix === "CURRENT" ? "active" : "testing",
    ),
    createdAt: envValue(`${envPrefix}_CONNECTION_CREATED_AT`, now),
    updatedAt: envValue(`${envPrefix}_CONNECTION_UPDATED_AT`, now),
    lastTestedAt: envValue(`${envPrefix}_LAST_TESTED_AT`) || undefined,
  };
}

function printMigrationTemplate() {
  console.info("[feishu:migration] 迁移计划需要先准备这些非敏感配置：");
  console.info('FEISHU_WORKSPACE_ID="a-group-workspace"');
  console.info('FEISHU_CONNECTION_ID="feishu-current"');
  console.info('FEISHU_APP_ID="cli_current_xxx"');
  console.info('FEISHU_TENANT_KEY="tenant_current_xxx"');
  console.info('FEISHU_DEFAULT_CHAT_ID="oc_current_xxx"');
  console.info('FEISHU_NEXT_CONNECTION_ID="feishu-next"');
  console.info('FEISHU_NEXT_APP_ID="cli_next_xxx"');
  console.info('FEISHU_NEXT_TENANT_KEY="tenant_next_xxx"');
  console.info('FEISHU_NEXT_DEFAULT_CHAT_ID="oc_next_xxx"');
  console.info('FEISHU_MIGRATION_REASON="从测试机器人迁移到正式机器人"');
  console.info('FEISHU_MIGRATION_INITIATED_BY="operator@example.com"');
  console.info("[feishu:migration] 不要把 App Secret、Encrypt Key、Verification Token 或 OAuth token 放进这些变量。");
}

function printNumberedList(title: string, items: string[]) {
  console.info(`[feishu:migration] ${title}`);

  items.forEach((item, index) => {
    console.info(`[feishu:migration] ${index + 1}. ${item}`);
  });
}

function main() {
  [".env", ".env.local"].filter(loadLocalEnvFile);

  const now = new Date().toISOString();
  const currentConnection = buildConnection("CURRENT", now);
  const nextConnection = buildConnection("NEXT", now);

  if (!currentConnection || !nextConnection) {
    console.info("[feishu:migration] 还没有完整的新旧飞书连接信息，先打印迁移配置模板。");
    printMigrationTemplate();
    process.exitCode = 0;
    return;
  }

  const plan = createFeishuMigrationPlan({
    currentConnection,
    nextConnection,
    reason: envValue("FEISHU_MIGRATION_REASON", "飞书机器人迁移"),
    initiatedBy: envValue("FEISHU_MIGRATION_INITIATED_BY", "local-operator"),
    now: new Date(now),
  });

  console.info("[feishu:migration] 当前连接公开快照：");
  console.info(JSON.stringify(toPublicFeishuConnectionConfig(currentConnection), null, 2));
  console.info("[feishu:migration] 新连接公开快照：");
  console.info(JSON.stringify(toPublicFeishuConnectionConfig(nextConnection), null, 2));
  console.info(
    `[feishu:migration] 迁移计划：${plan.fromConnectionId} -> ${plan.toConnectionId}，原因：${plan.reason}，执行人：${plan.initiatedBy}`,
  );
  printNumberedList("切换前检查：", plan.checklist);
  printNumberedList("回滚步骤：", plan.rollback);
  console.info("[feishu:migration] 这只是迁移草案，不会修改飞书后台或本地配置。先测试新机器人，再切换 active。");
}

main();
