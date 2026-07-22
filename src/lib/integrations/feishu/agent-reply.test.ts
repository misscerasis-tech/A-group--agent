import { describe, expect, it } from "vitest";
import {
  buildFeishuAgentReply,
  detectFeishuReplyIntent,
  parseFeishuTextContent,
} from "./agent-reply";

describe("feishu agent reply", () => {
  it("parses text content from Feishu message payload", () => {
    expect(parseFeishuTextContent(JSON.stringify({ text: "帮我看本周经营情况" }))).toBe(
      "帮我看本周经营情况",
    );
  });

  it("detects beginner data checklist intent", () => {
    expect(detectFeishuReplyIntent("我需要准备什么数据")).toBe("data_checklist");

    const reply = buildFeishuAgentReply("我需要准备什么数据");

    expect(reply).toContain("订单数据");
    expect(reply).toContain("不会假装看懂");
  });

  it("returns an ecommerce review for store review requests", () => {
    const reply = buildFeishuAgentReply("帮我看本周经营情况");

    expect(reply).toContain("样例店铺");
    expect(reply).toContain("建议你先做");
    expect(reply).toContain("真实订单");
  });

  it("analyzes pasted metrics csv directly", () => {
    const reply = buildFeishuAgentReply(
      [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,8,420,9",
      ].join("\n"),
    );

    expect(reply).toContain("刚粘贴的 CSV");
    expect(reply).toContain("飞书粘贴数据店铺");
  });
});
