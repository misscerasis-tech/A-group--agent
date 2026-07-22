const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";

const platformHeaderMetricsTable = [
  "周期,商品名称,商家编码,商品访客数,支付买家数,商品支付金额,支付商品件数,消耗,直接成交金额,可售件数,成本金额,毛利额,退款成功单数,退款成功金额,退款原因",
  "上周,黑杯,CUP-BLACK,100,10,500,12,80,240,50,320,180,1,30,杯盖漏水",
  "本周,黑杯,CUP-BLACK,120,9,450,10,90,180,40,330,120,2,80,杯盖漏水 / 物流慢",
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
  });

  assert(success.response.status === 200, `平台表头数据应该返回 200，实际 ${success.response.status}`);
  const report = success.body.report as { ok?: boolean; fieldMappings?: Array<{ sourceHeader?: string }> } | undefined;
  assert(report?.ok === true, "平台表头数据应该可分析。");
  assert(report.fieldMappings?.every((mapping) => mapping.sourceHeader), "字段映射不应该出现空 sourceHeader。");
  assert(typeof success.body.feishuReply === "string", "接口应该返回飞书回复文本。");
  assert((success.body.feishuReply as string).includes("退款/退货"), "飞书回复应该包含售后风险口径。");
  assert((success.body.feishuReply as string).includes("杯盖漏水"), "飞书回复应该引用退款/退货原因。");
  assert(typeof success.body.markdownReport === "string", "接口应该返回 Markdown 周报。");

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

  console.info(`[smoke:api] /api/agent/analyze 平台表头、缺参和缺字段检查均通过：${baseUrl}`);
}

main().catch((error) => {
  console.error(`[smoke:api] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

export {};
