import { describe, expect, it } from "vitest";
import {
  buildFeishuAgentReply,
  detectFeishuReplyIntent,
  parseFeishuTextContent,
} from "./agent-reply";
import { sampleEcommerceAgentInput } from "../../ecommerce-agent/sample-data";

describe("feishu agent reply", () => {
  it("parses text content from Feishu message payload", () => {
    expect(parseFeishuTextContent(JSON.stringify({ text: "帮我看本周经营情况" }))).toBe(
      "帮我看本周经营情况",
    );
  });

  it("detects beginner data checklist intent", () => {
    expect(detectFeishuReplyIntent("我需要准备什么数据")).toBe("data_checklist");
    expect(detectFeishuReplyIntent("首页怎么体现这些指标的重要性")).toBe("data_checklist");

    const reply = buildFeishuAgentReply("我需要准备什么数据");

    expect(reply).toContain("销售额");
    expect(reply).toContain("首页也是按这个重要性体现");
    expect(reply).toContain("客服备注");
    expect(reply).toContain("不会假装看懂");
  });

  it("answers what the beginner should do next", () => {
    const reply = buildFeishuAgentReply("我现在做什么");

    expect(reply).toContain("经营数据表");
    expect(reply).toContain("Markdown");
    expect(reply).toContain("Agent 动作");
  });

  it("answers real testing and Feishu connection questions", () => {
    expect(detectFeishuReplyIntent("怎么真正测试，接入飞书吗")).toBe("testing");

    const reply = buildFeishuAgentReply("怎么真正测试，接入飞书吗");

    expect(reply).toContain("先测 Agent 脑子");
    expect(reply).toContain("App Secret");
  });

  it("answers goal-specific ecommerce questions", () => {
    expect(buildFeishuAgentReply("这周先保利润")).toContain("目标是保利润");
    expect(buildFeishuAgentReply("广告怎么看")).toContain("花钱买订单");
    expect(buildFeishuAgentReply("竞品怎么看")).toContain("价格、促销、卖点");
    expect(buildFeishuAgentReply("退款退货怎么看")).toContain("售后把成交吃回去");
    expect(buildFeishuAgentReply("先保销量")).toContain("目标是保销量");
  });

  it("mentions refund reasons in direct returns replies when provided", () => {
    const reply = buildFeishuAgentReply("退款退货怎么看", {
      input: {
        ...sampleEcommerceAgentInput,
        currentWeek: {
          ...sampleEcommerceAgentInput.currentWeek,
          products: sampleEcommerceAgentInput.currentWeek.products.map((product) =>
            product.sku === "CUP-BLACK-500"
              ? {
                  ...product,
                  refundOrders: 16,
                  refundAmount: 680,
                  refundReason: "杯盖漏水 / 物流慢",
                }
              : product,
          ),
        },
      },
    });

    expect(reply).toContain("Aurora Cup 黑色");
    expect(reply).toContain("杯盖漏水");
    expect(reply).toContain("商品页说明");
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

    expect(reply).toContain("刚粘贴的表格");
    expect(reply).toContain("飞书粘贴数据店铺");
  });

  it("analyzes pasted spreadsheet-style tsv directly", () => {
    const reply = buildFeishuAgentReply(
      [
        "week\tproduct_name\torders\trevenue\tunits_sold",
        "previous\t黑杯\t10\t500\t12",
        "current\t黑杯\t8\t420\t9",
      ].join("\n"),
    );

    expect(reply).toContain("刚粘贴的表格");
    expect(reply).toContain("飞书粘贴数据店铺");
  });

  it("analyzes pasted platform-style Chinese tables directly", () => {
    const reply = buildFeishuAgentReply(
      [
        "周期\t商品名称\t支付买家数\t商品支付金额\t支付商品件数\t退款率\t退款原因",
        "上周\t黑杯\t10\t500\t12\t10%\t杯盖漏水",
        "本周\t黑杯\t8\t420\t9\t25%\t杯盖漏水 / 物流慢",
      ].join("\n"),
    );

    expect(reply).toContain("刚粘贴的表格");
    expect(reply).toContain("飞书粘贴数据店铺");
    expect(reply).toContain("杯盖漏水");
  });

  it("analyzes pasted markdown-style tables directly", () => {
    const reply = buildFeishuAgentReply(
      [
        "| week | product_name | orders | revenue | units_sold |",
        "| --- | --- | ---: | ---: | ---: |",
        "| previous | 黑杯 | 10 | 500 | 12 |",
        "| current | 黑杯 | 8 | 420 | 9 |",
      ].join("\n"),
    );

    expect(reply).toContain("刚粘贴的表格");
    expect(reply).toContain("飞书粘贴数据店铺");
  });
});
