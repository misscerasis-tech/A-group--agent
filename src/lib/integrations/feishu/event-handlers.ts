import { buildFeishuAgentReply, parseFeishuTextContent } from "./agent-reply";

export type FeishuReceiveMessageEvent = {
  sender?: {
    sender_type?: string;
  };
  message: {
    message_id: string;
    chat_id: string;
    message_type: string;
    content: string;
  };
};

export type SendFeishuTextMessage = (payload: {
  chatId: string;
  text: string;
  replyToMessageId?: string;
}) => Promise<void>;

export type BuildFeishuReply = (text: string) => string;

export type FeishuEventHandlerOptions = {
  maxProcessedMessageIds?: number;
};

export function createFeishuEventHandlers(
  sendTextMessage: SendFeishuTextMessage,
  buildReply: BuildFeishuReply = buildFeishuAgentReply,
  options: FeishuEventHandlerOptions = {},
) {
  const maxProcessedMessageIds = Math.max(options.maxProcessedMessageIds ?? 500, 1);
  const processedMessageIds = new Set<string>();
  const processedMessageQueue: string[] = [];

  function rememberMessage(messageId: string) {
    if (processedMessageIds.has(messageId)) {
      return false;
    }

    processedMessageIds.add(messageId);
    processedMessageQueue.push(messageId);

    while (processedMessageQueue.length > maxProcessedMessageIds) {
      const expiredMessageId = processedMessageQueue.shift();

      if (expiredMessageId) {
        processedMessageIds.delete(expiredMessageId);
      }
    }

    return true;
  }

  return {
    "im.message.receive_v1": async (event: FeishuReceiveMessageEvent) => {
      if (event.sender?.sender_type === "app") {
        return;
      }

      if (!rememberMessage(event.message.message_id)) {
        return;
      }

      if (event.message.message_type !== "text") {
        await sendTextMessage({
          chatId: event.message.chat_id,
          replyToMessageId: event.message.message_id,
          text: "我先支持文字消息。你可以发：帮我看本周经营情况。",
        });
        return;
      }

      const text = parseFeishuTextContent(event.message.content);
      let reply: string;

      try {
        reply = buildReply(text);
      } catch (error) {
        console.error("[feishu] 生成 Agent 回复失败：", error instanceof Error ? error.message : error);
        reply = "我收到消息了，但这次生成复盘时出错。你可以先发“我需要准备什么数据”，或把经营表格再贴一次。";
      }

      await sendTextMessage({
        chatId: event.message.chat_id,
        replyToMessageId: event.message.message_id,
        text: reply,
      });
    },
  };
}
