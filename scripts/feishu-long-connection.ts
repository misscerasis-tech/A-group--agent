import * as Lark from "@larksuiteoapi/node-sdk";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { requireFeishuRuntimeConfig } from "../src/lib/integrations/feishu/config";
import { buildFeishuAgentReply } from "../src/lib/integrations/feishu/agent-reply";
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

  return readFileSync(filePath, "utf8");
}

function loadEcommerceInputFromEnv() {
  const metricsCsv = readOptionalFile(process.env.ECOMMERCE_WEEKLY_METRICS_CSV);

  if (!metricsCsv) {
    return null;
  }

  const result = buildEcommerceInputFromCsv({
    metricsCsv,
    competitorsCsv: readOptionalFile(process.env.ECOMMERCE_COMPETITORS_CSV),
    store: {
      storeName: process.env.ECOMMERCE_STORE_NAME,
      platform: process.env.ECOMMERCE_PLATFORM,
      market: process.env.ECOMMERCE_MARKET,
      category: process.env.ECOMMERCE_CATEGORY,
      goal: process.env.ECOMMERCE_GOAL,
    },
  });

  if (!result.input) {
    const messages = result.report.issues.map((issue) => `- ${issue.message}`).join("\n");
    throw new Error(`导入的电商数据还不能分析：\n${messages}`);
  }

  return {
    input: result.input,
    warningCount: result.report.issues.filter((issue) => issue.severity !== "info").length,
  };
}

async function main() {
  const config = requireFeishuRuntimeConfig();
  const importedData = loadEcommerceInputFromEnv();

  if (importedData) {
    console.info(
      `[feishu] 已加载本地经营数据：${importedData.input.store.storeName}，提醒 ${importedData.warningCount} 条。`,
    );
  } else {
    console.info("[feishu] 未配置本地经营数据文件，先使用样例店铺回复。");
  }

  const client = new Lark.Client({
    appId: config.appId,
    appSecret: config.appSecret,
  });

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
      createFeishuEventHandlers(sendTextMessage, (text) =>
        buildFeishuAgentReply(text, {
          input: importedData?.input,
          sourceLabel: importedData ? "当前导入数据" : "样例店铺",
        }),
      ),
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
