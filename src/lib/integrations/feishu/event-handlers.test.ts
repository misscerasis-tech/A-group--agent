import { describe, expect, it, vi } from "vitest";
import { createFeishuEventHandlers } from "./event-handlers";

describe("feishu event handlers", () => {
  it("replies to the original message", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage, () => "复盘结果");

    await handlers["im.message.receive_v1"]({
      sender: {
        sender_type: "user",
      },
      message: {
        message_id: "om_123",
        chat_id: "oc_123",
        message_type: "text",
        content: JSON.stringify({ text: "帮我看本周经营情况" }),
      },
    });

    expect(sendTextMessage).toHaveBeenCalledWith({
      chatId: "oc_123",
      replyToMessageId: "om_123",
      text: "复盘结果",
    });
  });

  it("ignores app-sent messages to avoid loops", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage);

    await handlers["im.message.receive_v1"]({
      sender: {
        sender_type: "app",
      },
      message: {
        message_id: "om_123",
        chat_id: "oc_123",
        message_type: "text",
        content: JSON.stringify({ text: "机器人自己的消息" }),
      },
    });

    expect(sendTextMessage).not.toHaveBeenCalled();
  });
});
