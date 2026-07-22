import { describe, expect, it, vi } from "vitest";
import { createFeishuEventHandlers, type FeishuReceiveMessageEvent } from "./event-handlers";

describe("feishu event handlers", () => {
  const textEvent = {
    sender: {
      sender_type: "user",
    },
    message: {
      message_id: "om_123",
      chat_id: "oc_123",
      message_type: "text",
      content: JSON.stringify({ text: "帮我看本周经营情况" }),
    },
  };

  it("replies to the original message", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage, () => "复盘结果");

    await handlers["im.message.receive_v1"](textEvent);

    expect(sendTextMessage).toHaveBeenCalledWith({
      chatId: "oc_123",
      replyToMessageId: "om_123",
      text: "复盘结果",
    });
  });

  it("passes the Feishu event into reply builders for chat-scoped context", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const buildReply = vi.fn((text: string, event: FeishuReceiveMessageEvent) => `${event.message.chat_id}:${text}`);
    const handlers = createFeishuEventHandlers(sendTextMessage, buildReply);

    await handlers["im.message.receive_v1"](textEvent);

    expect(buildReply).toHaveBeenCalledWith("帮我看本周经营情况", textEvent);
    expect(sendTextMessage).toHaveBeenCalledWith({
      chatId: "oc_123",
      replyToMessageId: "om_123",
      text: "oc_123:帮我看本周经营情况",
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

  it("deduplicates repeated Feishu message events", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage, () => "复盘结果");

    await handlers["im.message.receive_v1"](textEvent);
    await handlers["im.message.receive_v1"](textEvent);

    expect(sendTextMessage).toHaveBeenCalledTimes(1);
  });

  it("keeps dedupe memory bounded", async () => {
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage, () => "复盘结果", {
      maxProcessedMessageIds: 1,
    });

    await handlers["im.message.receive_v1"](textEvent);
    await handlers["im.message.receive_v1"]({
      ...textEvent,
      message: {
        ...textEvent.message,
        message_id: "om_456",
      },
    });
    await handlers["im.message.receive_v1"](textEvent);

    expect(sendTextMessage).toHaveBeenCalledTimes(3);
  });

  it("sends a friendly fallback when reply generation fails", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const sendTextMessage = vi.fn().mockResolvedValue(undefined);
    const handlers = createFeishuEventHandlers(sendTextMessage, () => {
      throw new Error("analysis failed");
    });

    try {
      await handlers["im.message.receive_v1"](textEvent);

      expect(sendTextMessage).toHaveBeenCalledWith({
        chatId: "oc_123",
        replyToMessageId: "om_123",
        text: expect.stringContaining("生成复盘时出错"),
      });
    } finally {
      consoleError.mockRestore();
    }
  });
});
