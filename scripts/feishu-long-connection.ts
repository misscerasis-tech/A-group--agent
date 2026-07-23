import * as Lark from "@larksuiteoapi/node-sdk";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { decodeUploadedTableText } from "../src/lib/ecommerce-agent/text-decode";
import { requireFeishuRuntimeConfig } from "../src/lib/integrations/feishu/config";
import {
  buildFeishuAuxiliaryTableNeedsMetricsReply,
  buildFeishuAgentReply,
  buildFeishuClearContextReply,
  buildFeishuImportContextFromText,
  buildFeishuImportContextFromTables,
  detectFeishuPastedTableKind,
  isFeishuClearContextRequest,
} from "../src/lib/integrations/feishu/agent-reply";
import {
  createFileFeishuChatContextStore,
  createInMemoryFeishuChatContextStore,
  resolveFeishuChatContextFile,
} from "../src/lib/integrations/feishu/chat-context-store";
import { createFeishuEventHandlers } from "../src/lib/integrations/feishu/event-handlers";

function loadLocalEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
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
}

loadLocalEnvFile(".env");
loadLocalEnvFile(".env.local");

function readOptionalFile(pathValue: string | undefined) {
  if (!pathValue?.trim()) {
    return undefined;
  }

  const filePath = resolve(process.cwd(), pathValue.trim());

  if (!existsSync(filePath)) {
    throw new Error(`找不到导入数据文件：${filePath}`);
  }

  return decodeUploadedTableText(readFileSync(filePath));
}

function loadEcommerceContextFromEnv() {
  const metricsCsv = readOptionalFile(process.env.ECOMMERCE_WEEKLY_METRICS_CSV);

  if (!metricsCsv) {
    return null;
  }

  const context = buildFeishuImportContextFromTables({
    tables: {
      metricsCsv,
      competitorsCsv: readOptionalFile(process.env.ECOMMERCE_COMPETITORS_CSV),
      customerVoicesCsv: readOptionalFile(process.env.ECOMMERCE_CUSTOMER_VOICES_CSV),
      inventoryCsv: readOptionalFile(process.env.ECOMMERCE_INVENTORY_CSV),
      adsCsv: readOptionalFile(process.env.ECOMMERCE_ADS_CSV),
    },
    store: {
      storeName: process.env.ECOMMERCE_STORE_NAME,
      platform: process.env.ECOMMERCE_PLATFORM,
      market: process.env.ECOMMERCE_MARKET,
      category: process.env.ECOMMERCE_CATEGORY,
      goal: process.env.ECOMMERCE_GOAL,
    },
    sourceLabel: "当前导入数据",
  });

  if (!context) {
    return null;
  }

  if (!context.input) {
    return {
      ...context,
      warningCount: context.report.issues.filter((issue) => issue.severity !== "info").length,
    };
  }

  return {
    ...context,
    warningCount: context.report.issues.filter((issue) => issue.severity !== "info").length,
  };
}

async function main() {
  const config = requireFeishuRuntimeConfig();
  const importedData = loadEcommerceContextFromEnv();

  if (importedData?.input) {
    console.info(
      `[feishu] 已加载本地经营数据：${importedData.input.store.storeName}，提醒 ${importedData.warningCount} 条。`,
    );
  } else if (importedData) {
    console.warn(
      `[feishu] 已读取本地经营数据文件，但还不能分析。worker 会继续启动，并在飞书里追问缺失字段，提醒 ${importedData.warningCount} 条。`,
    );
  } else {
    console.info("[feishu] 未配置本地经营数据文件，先使用样例店铺回复。");
  }

  const client = new Lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
  });
  const chatContextFile = resolveFeishuChatContextFile();
  const chatContexts = chatContextFile
    ? createFileFeishuChatContextStore(chatContextFile, {
        onWarning: (message) => console.warn(`[feishu] ${message}`),
      })
    : createInMemoryFeishuChatContextStore();

  if (chatContextFile) {
    console.info(`[feishu] 会话上下文会保存在本机：${chatContextFile}`);
    console.info(`[feishu] 已恢复 ${chatContexts.size()} 个飞书会话的最近导入数据。`);
  } else {
    console.info("[feishu] 已关闭飞书会话上下文持久化；worker 重启后需要重新粘贴经营表。");
  }

  const wsClient = new Lark.WSClient({
    appId: config.appId,
    appSecret: config.appSecret,
    autoReconnect: true,
    loggerLevel: Lark.LoggerLevel.info,
    source: "a-group-ecommerce-ops-agent",
    onReady: () => {
      console.info("[feishu] 长连接已建立，可以在飞书里给机器人发消息测试。");
    },
    onError: (error) => {
      console.error("[feishu] 长连接启动失败：", error.message);
    },
    onReconnecting: () => {
      console.info("[feishu] 长连接断开，正在重连。");
    },
    onReconnected: () => {
      console.info("[feishu] 长连接已重新建立。");
    },
  });

  async function sendTextMessage({
    chatId,
    text,
    replyToMessageId,
  }: {
    chatId: string;
    text: string;
    replyToMessageId?: string;
  }) {
    if (replyToMessageId) {
      try {
        await client.im.v1.message.reply({
          path: {
            message_id: replyToMessageId,
          },
          data: {
            msg_type: "text",
            content: JSON.stringify({ text }),
          },
        });
        return;
      } catch (error) {
        console.warn(
          "[feishu] 回复原消息失败，降级为发送到当前会话：",
          error instanceof Error ? error.message : error,
        );
      }
    }

    await client.im.v1.message.create({
      params: {
        receive_id_type: "chat_id",
      },
      data: {
        receive_id: chatId,
        msg_type: "text",
        content: JSON.stringify({ text }),
      },
    });
  }

  await wsClient.start({
    eventDispatcher: new Lark.EventDispatcher({}).register(
      createFeishuEventHandlers(sendTextMessage, (text, event) => {
        if (isFeishuClearContextRequest(text)) {
          const didClear = chatContexts.delete(event.message.chat_id);

          return buildFeishuClearContextReply(didClear);
        }

        const existingContext = chatContexts.get(event.message.chat_id) ?? importedData;
        const pastedContext = buildFeishuImportContextFromText(text, existingContext);

        if (pastedContext) {
          chatContexts.set(event.message.chat_id, pastedContext);
          return buildFeishuAgentReply(text, pastedContext);
        }

        const pastedTableKind = detectFeishuPastedTableKind(text);

        if (pastedTableKind && pastedTableKind !== "metrics") {
          return buildFeishuAuxiliaryTableNeedsMetricsReply(pastedTableKind);
        }

        const context = existingContext;

        return buildFeishuAgentReply(text, {
          input: context?.input,
          report: context?.report,
          sourceLabel: context?.sourceLabel ?? "样例店铺",
        });
      }),
    ),
  });

  process.on("SIGINT", () => {
    wsClient.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    wsClient.close();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
