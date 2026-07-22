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

export function createFeishuEventHandlers(
  sendTextMessage: SendFeishuTextMessage,
  buildReply: BuildFeishuReply = buildFeishuAgentReply,
) {
  return {
    "im.message.receive_v1": async (event: FeishuReceiveMessageEvent) => {
      if (event.sender?.sender_type === "app") {
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
      const reply = buildReply(text);

      await sendTextMessage({
        chatId: event.message.chat_id,
        replyToMessageId: event.message.message_id,
        text: reply,
      });
    },
  };
}
