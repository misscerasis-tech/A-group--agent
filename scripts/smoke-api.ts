const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";

const platformHeaderMetricsTable = [
  "周期,商品名称,商家编码,商品访客数,支付买家数,商品支付金额,支付商品件数,消耗,直接成交金额,可售件数,成本金额,毛利额,退款成功单数,退款成功金额,退款原因",
  "上周,黑杯,CUP-BLACK,100,10,500,12,80,240,50,320,180,1,30,杯盖漏水",
  "本周,黑杯,CUP-BLACK,120,9,450,10,90,180,40,330,120,2,80,杯盖漏水 / 物流慢",
].join("\n");

const customerVoiceTable = [
  "商品名称,商家编码,反馈来源,评价日期,正负向,问题类型,评价内容,出现次数",
  "黑杯,CUP-BLACK,商品评价,2026-07-19,负向,杯盖漏水,用户说杯盖渗水,4",
].join("\n");

const inventoryTable = [
  "商品名称,商家编码,当前库存,单位成本,库存日期",
  "黑杯,CUP-BLACK,18,18,2026-07-19",
].join("\n");
const adsTable = [
  "周期,商品名称,商家编码,广告花费,ROAS",
  "上周,黑杯,CUP-BLACK,80,300%",
  "本周,黑杯,CUP-BLACK,90,2",
].join("\n");

const orderDetailMetricsTable = [
  "订单号,支付时间,商品名称,商家编码,购买数量,实付金额,退款金额,售后状态",
  "O-1001,2026-07-08 10:11:00,黑杯,CUP-BLACK,2,79.8,,已完成",
  "O-1002,2026-07-09 12:30:00,黑杯,CUP-BLACK,1,39.9,0,已完成",
  "O-1003,2026-07-15 09:20:00,黑杯,CUP-BLACK,1,39.9,39.9,已退款",
  "O-1004,2026-07-16 19:45:00,白杯,CUP-WHITE,3,119.7,,已完成",
].join("\n");

async function postAnalyze(body: unknown) {
  const response = await fetch(new URL("/api/agent/analyze", baseUrl), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return {
    response,
    body: (await response.json()) as Record<string, unknown>,
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const success = await postAnalyze({
    store: {
      storeName: "A组接口测试店",
      platform: "平台导出表",
    },
    metricsCsv: platformHeaderMetricsTable,
    adsCsv: adsTable,
    inventoryCsv: inventoryTable,
    customerVoicesCsv: customerVoiceTable,
  });

  assert(success.response.status === 200, `平台表头数据应该返回 200，实际 ${success.response.status}`);
  const report = success.body.report as
    | {
        ok?: boolean;
        fieldMappings?: Array<{ sourceHeader?: string }>;
        customerVoiceRows?: number;
        inventoryRows?: number;
        adRows?: number;
        metricsInputKind?: string;
      }
    | undefined;
  assert(report?.ok === true, "平台表头数据应该可分析。");
  assert(report.metricsInputKind === "weekly_metrics", "平台表头数据应该被识别为周汇总表。");
  assert(report.fieldMappings?.every((mapping) => mapping.sourceHeader), "字段映射不应该出现空 sourceHeader。");
  assert(report.adRows === 2, "接口应该识别广告数据表行数。");
  assert(report.inventoryRows === 1, "接口应该识别库存/成本快照表行数。");
  assert(report.customerVoiceRows === 1, "接口应该识别用户声音表行数。");
  assert(typeof success.body.feishuReply === "string", "接口应该返回飞书回复文本。");
  assert((success.body.feishuReply as string).includes("退款/退货"), "飞书回复应该包含售后风险口径。");
  assert((success.body.feishuReply as string).includes("杯盖漏水"), "飞书回复应该引用退款/退货原因。");
  assert(typeof success.body.markdownReport === "string", "接口应该返回 Markdown 周报。");
  assert(
    Array.isArray((success.body.analysis as { operationalTasks?: unknown } | undefined)?.operationalTasks),
    "接口应该返回结构化运营待办。",
  );
  assert(String(success.body.taskTable ?? "").includes("优先级\t截止\t负责人"), "接口应该返回可粘贴的待办表格。");
  assert(String(success.body.markdownReport).includes("验收标准"), "Markdown 周报应该包含待办验收标准。");
  assert(
    String((success.body.workSession as { nextQuestion?: string } | undefined)?.nextQuestion ?? "").includes("竞品"),
    "成功分析后，workSession 应该继续追问分析发现的缺口。",
  );

  const orderDetail = await postAnalyze({
    store: {
      storeName: "A组订单明细测试店",
      platform: "订单导出表",
    },
    metricsCsv: orderDetailMetricsTable,
  });
  const orderDetailReport = orderDetail.body.report as { ok?: boolean; metricsInputKind?: string } | undefined;
  assert(orderDetail.response.status === 200, `订单明细数据应该返回 200，实际 ${orderDetail.response.status}`);
  assert(orderDetailReport?.ok === true, "订单明细数据应该可分析。");
  assert(orderDetailReport.metricsInputKind === "order_details", "订单明细应该被接口识别并聚合。");
  assert(String(orderDetail.body.feishuReply ?? "").includes("已退款"), "订单明细回复应该引用售后状态。");

  const missingBody = await postAnalyze({});
  assert(missingBody.response.status === 400, `缺 metricsCsv 应该返回 400，实际 ${missingBody.response.status}`);
  assert(
    String(missingBody.body.error ?? "").includes("经营数据"),
    "缺 metricsCsv 的错误提示应该说明要传经营数据。",
  );

  const missingFields = await postAnalyze({
    metricsCsv: ["周期,商品名称,销售额", "本周,黑杯,450"].join("\n"),
  });
  assert(missingFields.response.status === 422, `缺必填字段应该返回 422，实际 ${missingFields.response.status}`);
  assert(missingFields.body.workSession, "缺字段时应该返回 Agent 接手步骤。");

  console.info(
    `[smoke:api] /api/agent/analyze 平台表头、订单明细、广告数据、库存/成本快照、缺参和缺字段检查均通过：${baseUrl}`,
  );
}

main().catch((error) => {
  console.error(`[smoke:api] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

export {};
