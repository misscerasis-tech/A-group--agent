import { describe, expect, it } from "vitest";
import { buildEcommerceInputFromCsv, parseCsv } from "./csv-import";

describe("ecommerce csv import", () => {
  it("parses quoted csv cells", () => {
    const table = parseCsv('name,revenue\n"Aurora, black",1234');

    expect(table.rows[0].name).toBe("Aurora, black");
    expect(table.delimiter).toBe(",");
  });

  it("parses tab-separated data copied from spreadsheets", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week\tproduct_name\torders\trevenue\tunits_sold",
        "previous\t黑杯\t10\t500\t12",
        "current\t黑杯\t9\t450\t10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
  });

  it("parses semicolon-separated platform exports", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week;product_name;orders;revenue;units_sold",
        "previous;黑杯;10;500;12",
        "current;黑杯;9;450;10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].orders).toBe(9);
  });

  it("parses markdown-style tables pasted from docs or chat", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "| week | product_name | orders | revenue | units_sold | refund_orders | refund_amount |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: |",
        "| previous | 黑杯 | 10 | 500 | 12 | 1 | 30 |",
        "| current | 黑杯 | 9 | 450 | 10 | 2 | 80 |",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
    expect(result.input?.currentWeek.products[0].refundAmount).toBe(80);
  });

  it("maps Chinese ecommerce headers into agent input", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,访客数,订单数,销售额,销量,广告花费,广告成交额,库存",
        "上周,黑杯,CUP-BLACK,100,10,500,12,80,240,50",
        "本周,黑杯,CUP-BLACK,120,9,450,10,90,180,40",
      ].join("\n"),
      competitorsCsv: ["竞品名称,价格,促销,核心卖点", "竞品 A,39.9,满减,低价 / 大容量"].join("\n"),
      store: {
        storeName: "真实店铺导入测试",
        platform: "Shopify",
      },
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.store.storeName).toBe("真实店铺导入测试");
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
    expect(result.input?.competitors[0].keySellingPoints).toEqual(["低价", "大容量"]);
  });

  it("maps platform-style Chinese export headers into agent input", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,商家编码,商品访客数,支付买家数,商品支付金额,支付商品件数,消耗,直接成交金额,可售件数,成本金额,毛利额,退款成功单数,退款成功金额,退款原因",
        "上周,黑杯,CUP-BLACK,100,10,500,12,80,240,50,320,180,1,30,杯盖漏水",
        "本周,黑杯,CUP-BLACK,120,9,450,10,90,180,40,330,120,2,80,杯盖漏水 / 物流慢",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.fieldMappings.some((mapping) => mapping.canonicalField === "startDate")).toBe(false);
    expect(result.report.fieldMappings.some((mapping) => !mapping.sourceHeader)).toBe(false);
    expect(result.input?.currentWeek.products[0]).toMatchObject({
      sku: "CUP-BLACK",
      visitors: 120,
      orders: 9,
      revenue: 450,
      unitsSold: 10,
      adSpend: 90,
      adRevenue: 180,
      inventory: 40,
      productCost: 330,
      grossProfit: 120,
      refundOrders: 2,
      refundAmount: 80,
      refundReason: "杯盖漏水 / 物流慢",
    });
  });

  it("recognizes previous and current period aliases used by platform exports", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "统计周期,商品名称,订单数,销售额,销量",
        "上期,黑杯,10,500,12",
        "本期,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.products[0].orders).toBe(10);
    expect(result.input?.currentWeek.products[0].orders).toBe(9);
  });

  it("parses platform numbers with Chinese units", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,订单数,销售额,销量,广告花费,广告成交额,库存,退款单数,退款金额",
        "上周,黑杯,90单,1.2万元,100件,800元,3200元,50件,1单,30元",
        "本周,黑杯,80单,9800元,88件,900元,2.6千元,40件,2单,80元",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.products[0]).toMatchObject({
      orders: 90,
      revenue: 12000,
      unitsSold: 100,
      adSpend: 800,
      adRevenue: 3200,
      inventory: 50,
      refundOrders: 1,
      refundAmount: 30,
    });
    expect(result.input?.currentWeek.products[0]).toMatchObject({
      orders: 80,
      revenue: 9800,
      unitsSold: 88,
      adSpend: 900,
      adRevenue: 2600,
      inventory: 40,
      refundOrders: 2,
      refundAmount: 80,
    });
  });

  it("derives analyzable metrics from platform rate fields", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,订单数,销售额,销量,转化率,广告消耗,ROAS,毛利率,退款率,退款金额占比",
        "上周,黑杯,10,500,12,10%,80,300%,40%,10%,6%",
        "本周,黑杯,8,420,9,8%,90,2.5,30%,25%,19.05%",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0]).toMatchObject({
      visitors: 100,
      adSpend: 90,
      adRevenue: 225,
      grossProfit: 126,
      refundOrders: 2,
      refundAmount: 80.01,
    });
    expect(
      result.report.fieldMappings.some(
        (mapping) => mapping.canonicalField === "adReturn" && mapping.sourceHeader === "ROAS",
      ),
    ).toBe(true);
  });

  it("merges duplicate sku rows within the same period before analysis", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,订单数,销售额,销量,库存,退款单数,退款金额,退款原因",
        "上周,黑杯,CUP-BLACK,6,300,7,50,1,30,杯盖漏水",
        "上周,黑杯,CUP-BLACK,4,200,5,48,0,0,",
        "本周,黑杯,CUP-BLACK,5,250,6,45,1,30,杯盖漏水",
        "本周,黑杯,CUP-BLACK,3,170,3,42,1,50,物流慢",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products).toHaveLength(1);
    expect(result.input?.currentWeek.products[0]).toMatchObject({
      orders: 8,
      revenue: 420,
      unitsSold: 9,
      inventory: 42,
      refundOrders: 2,
      refundAmount: 80,
      refundReason: "杯盖漏水 / 物流慢",
    });
    expect(result.report.issues.some((issue) => issue.message.includes("重复 SKU"))).toBe(true);
  });

  it("asks for missing required fields instead of guessing", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: ["周期,商品名称,销售额", "本周,黑杯,450"].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.input).toBeUndefined();
    expect(result.report.questionsForUser.some((question) => question.includes("订单数"))).toBe(true);
    expect(result.report.issues.some((issue) => issue.severity === "error")).toBe(true);
    expect(
      result.report.fieldMappings.some(
        (mapping) => mapping.canonicalField === "orders" && mapping.required && !mapping.sourceHeader,
      ),
    ).toBe(true);
  });

  it("uses product name as a temporary key when sku is missing", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].sku).toBe("黑杯");
    expect(result.report.issues.some((issue) => issue.message.includes("临时用商品名称"))).toBe(true);
  });

  it("does not let empty store overrides erase defaults", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "previous,黑杯,10,500,12",
        "current,黑杯,9,450,10",
      ].join("\n"),
      store: {
        storeName: "",
        platform: undefined,
      },
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.store.storeName).toBe("待导入店铺");
    expect(result.input?.store.platform).toBe("待确认平台");
  });

  it("imports cost and gross profit fields when available", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,商品成本,毛利",
        "previous,黑杯,10,500,12,320,180",
        "current,黑杯,9,450,10,330,120",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].productCost).toBe(330);
    expect(result.input?.currentWeek.products[0].grossProfit).toBe(120);
  });

  it("imports refund and return fields from Chinese headers", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,订单数,销售额,销量,退款单数,退款金额",
        "上周,黑杯,10,500,12,1,30",
        "本周,黑杯,9,450,10,2,80",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].refundOrders).toBe(2);
    expect(result.input?.currentWeek.products[0].refundAmount).toBe(80);
    expect(
      result.report.fieldMappings.some(
        (mapping) => mapping.canonicalField === "refundOrders" && mapping.sourceHeader === "退款单数",
      ),
    ).toBe(true);
  });

  it("imports refund and return reasons from Chinese headers", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,订单数,销售额,销量,退款单数,退款金额,售后原因",
        "上周,黑杯,10,500,12,1,30,杯盖漏水",
        "本周,黑杯,9,450,10,2,80,物流慢 / 漏水",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.currentWeek.products[0].refundReason).toBe("物流慢 / 漏水");
    expect(
      result.report.fieldMappings.some(
        (mapping) => mapping.canonicalField === "refundReason" && mapping.sourceHeader === "售后原因",
      ),
    ).toBe(true);
  });

  it("imports customer voice rows from review or service tables", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,订单数,销售额,销量,退款单数,退款金额",
        "上周,黑杯,CUP-BLACK,10,500,12,1,30",
        "本周,黑杯,CUP-BLACK,9,450,10,2,80",
      ].join("\n"),
      customerVoicesCsv: [
        "商品名称,商家编码,反馈来源,评价日期,正负向,问题类型,评价内容,出现次数",
        "黑杯,CUP-BLACK,商品评价,2026-07-19,负向,杯盖漏水,用户说杯盖渗水,4",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.customerVoiceRows).toBe(1);
    expect(result.input?.customerVoices?.[0]).toMatchObject({
      productName: "黑杯",
      sku: "CUP-BLACK",
      source: "商品评价",
      sentiment: "negative",
      theme: "杯盖漏水",
      count: 4,
    });
  });

  it("matches standalone inventory snapshots into current week products", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,订单数,销售额,销量",
        "上周,黑杯,CUP-BLACK,10,500,12",
        "本周,黑杯,CUP-BLACK,9,450,10",
      ].join("\n"),
      inventoryCsv: [
        "商品名称,商家编码,当前库存,库存日期",
        "黑杯,CUP-BLACK,18,2026-07-19",
        "蓝杯,CUP-BLUE,7,2026-07-19",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.inventoryRows).toBe(2);
    expect(result.input?.currentWeek.products[0].inventory).toBe(18);
    expect(result.report.issues.some((issue) => issue.message.includes("库存/成本快照"))).toBe(true);
    expect(result.report.issues.some((issue) => issue.message.includes("没有匹配"))).toBe(true);
  });

  it("uses product snapshot unit cost to fill gross profit", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "周期,商品名称,SKU,订单数,销售额,销量",
        "上周,黑杯,CUP-BLACK,10,500,12",
        "本周,黑杯,CUP-BLACK,9,450,10",
      ].join("\n"),
      inventoryCsv: ["商品名称,商家编码,单位成本", "黑杯,CUP-BLACK,18"].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.products[0]).toMatchObject({
      productCost: 216,
      grossProfit: 284,
    });
    expect(result.input?.currentWeek.products[0]).toMatchObject({
      productCost: 180,
      grossProfit: 270,
    });
  });

  it("uses the latest two periods when a platform export contains more than two weeks", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold",
        "2026-07-01,黑杯,8,400,9",
        "2026-07-08,黑杯,10,500,12",
        "2026-07-15,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.products[0].revenue).toBe(500);
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
    expect(result.report.issues.some((issue) => issue.message.includes("最近两期"))).toBe(true);
  });

  it("uses start date as the period when a platform export has no week column", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "start_date,end_date,product_name,orders,revenue,units_sold",
        "2026-07-01,2026-07-07,黑杯,8,400,9",
        "2026-07-08,2026-07-14,黑杯,10,500,12",
        "2026-07-15,2026-07-21,黑杯,9,450,10",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.startDate).toBe("2026-07-08");
    expect(result.input?.currentWeek.startDate).toBe("2026-07-15");
    expect(result.input?.currentWeek.products[0].revenue).toBe(450);
  });

  it("aggregates order detail exports into weekly sku metrics", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "订单号,支付时间,商品名称,商家编码,购买数量,实付金额,退款金额,售后状态",
        "O-1001,2026-07-08 10:11:00,黑杯,CUP-BLACK,2,79.8,,已完成",
        "O-1002,2026-07-09 12:30:00,黑杯,CUP-BLACK,1,39.9,0,已完成",
        "O-1003,2026-07-15 09:20:00,黑杯,CUP-BLACK,1,39.9,39.9,已退款",
        "O-1004,2026-07-16 19:45:00,白杯,CUP-WHITE,3,119.7,,已完成",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.metricsInputKind).toBe("order_details");
    expect(result.input?.previousWeek).toMatchObject({
      startDate: "2026-07-06",
      endDate: "2026-07-12",
    });
    expect(result.input?.currentWeek).toMatchObject({
      startDate: "2026-07-13",
      endDate: "2026-07-19",
    });
    expect(result.input?.previousWeek.products[0]).toMatchObject({
      sku: "CUP-BLACK",
      orders: 2,
      revenue: 119.7,
      unitsSold: 3,
      refundOrders: 0,
      refundAmount: 0,
    });
    expect(result.input?.currentWeek.products.find((product) => product.sku === "CUP-BLACK")).toMatchObject({
      orders: 1,
      revenue: 39.9,
      unitsSold: 1,
      refundOrders: 1,
      refundAmount: 39.9,
      refundReason: "已退款",
    });
    expect(result.report.issues.some((issue) => issue.message.includes("订单明细"))).toBe(true);
  });

  it("uses the latest two natural weeks when order details cover more than two weeks", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "订单号,支付时间,商品名称,商家编码,购买数量,实付金额",
        "O-9001,2026-07-01,黑杯,CUP-BLACK,1,39.9",
        "O-9002,2026-07-08,黑杯,CUP-BLACK,2,79.8",
        "O-9003,2026-07-15,黑杯,CUP-BLACK,3,119.7",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.input?.previousWeek.startDate).toBe("2026-07-06");
    expect(result.input?.currentWeek.startDate).toBe("2026-07-13");
    expect(result.report.issues.some((issue) => issue.message.includes("最近两周"))).toBe(true);
  });

  it("asks for another week when order details only contain one natural week", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "订单号,支付时间,商品名称,商家编码,购买数量,实付金额",
        "O-1001,2026-07-15,黑杯,CUP-BLACK,1,39.9",
        "O-1002,2026-07-16,黑杯,CUP-BLACK,2,79.8",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.metricsInputKind).toBe("order_details");
    expect(result.report.questionsForUser.some((question) => question.includes("两个自然周"))).toBe(true);
  });

  it("rejects impossible negative operating metrics", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,inventory",
        "previous,黑杯,-1,500,12,20",
        "current,黑杯,9,450,10,-3",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.message.includes("不能为负数"))).toBe(true);
    expect(result.report.issues.some((issue) => issue.rowNumber === 3 && issue.message.includes("库存"))).toBe(
      true,
    );
    expect(result.report.questionsForUser[0]).toContain("请修正第 2 行");
  });

  it("rejects negative refund metrics", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,refund_amount",
        "previous,黑杯,10,500,12,30",
        "current,黑杯,9,450,10,-5",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(false);
    expect(result.report.issues.some((issue) => issue.message.includes("退款金额"))).toBe(true);
  });

  it("warns when refund metrics may include historical orders", () => {
    const result = buildEcommerceInputFromCsv({
      metricsCsv: [
        "week,product_name,orders,revenue,units_sold,refund_orders,refund_amount",
        "previous,黑杯,10,500,12,1,30",
        "current,黑杯,2,100,2,3,130",
      ].join("\n"),
    });

    expect(result.report.ok).toBe(true);
    expect(result.report.issues.some((issue) => issue.severity === "warning" && issue.message.includes("历史订单"))).toBe(
      true,
    );
  });
});
