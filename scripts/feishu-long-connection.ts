import * as Lark from "@larksuiteoapi/node-sdk";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireFeishuRuntimeConfig } from "../src/lib/integrations/feishu/config";
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

async function main() {
  const config = requireFeishuRuntimeConfig();

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
  }: {
    chatId: string;
    text: string;
    replyToMessageId?: string;
  }) {
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
      createFeishuEventHandlers(sendTextMessage),
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
