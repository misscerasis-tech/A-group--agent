import { NextResponse } from "next/server";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "@/lib/ecommerce-agent/csv-import";
import { buildDataRequestPlan, buildDataRequestPlanTsv } from "@/lib/ecommerce-agent/data-request";
import {
  buildOperationalTasksTsv,
  buildProductFindingsTsv,
  buildWeeklyMarkdownReport,
} from "@/lib/ecommerce-agent/report";
import { ecommerceKpiGuide } from "@/lib/ecommerce-agent/kpi-guide";
import { buildBeginnerWorkSession } from "@/lib/ecommerce-agent/work-session";
import type { StoreProfile } from "@/lib/ecommerce-agent/types";
import { formatEcommerceAnalysisForFeishu } from "@/lib/integrations/feishu/agent-reply";

export const dynamic = "force-dynamic";

type AnalyzeRequestBody = {
  metricsCsv?: string;
  competitorsCsv?: string;
  customerVoicesCsv?: string;
  inventoryCsv?: string;
  adsCsv?: string;
  store?: Partial<StoreProfile>;
};

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    body = (await request.json()) as AnalyzeRequestBody;
  } catch {
    return NextResponse.json(
      {
        error: "请求体需要是 JSON。",
      },
      { status: 400 },
    );
  }

  if (!body.metricsCsv?.trim()) {
    const dataRequestPlan = buildDataRequestPlan();

    return NextResponse.json(
      {
        error: "缺少 metricsCsv。请传经营数据 CSV、TSV、Markdown 或复制表格文本。",
        kpiGuide: ecommerceKpiGuide,
        workSession: buildBeginnerWorkSession(),
        dataRequestPlan,
        dataRequestTable: buildDataRequestPlanTsv(dataRequestPlan),
      },
      { status: 400 },
    );
  }

  const importResult = buildEcommerceInputFromCsv({
    metricsCsv: body.metricsCsv,
    competitorsCsv: body.competitorsCsv,
    customerVoicesCsv: body.customerVoicesCsv,
    inventoryCsv: body.inventoryCsv,
    adsCsv: body.adsCsv,
    store: body.store,
  });

  if (!importResult.input) {
    const dataRequestPlan = buildDataRequestPlan(importResult.report);

    return NextResponse.json(
      {
        report: importResult.report,
        kpiGuide: ecommerceKpiGuide,
        workSession: buildBeginnerWorkSession(importResult.report),
        dataRequestPlan,
        dataRequestTable: buildDataRequestPlanTsv(dataRequestPlan),
      },
      { status: 422 },
    );
  }

  const analysis = analyzeEcommerceStore(importResult.input);
  const dataRequestPlan = buildDataRequestPlan(importResult.report, analysis.questionsForUser);

  return NextResponse.json({
    report: importResult.report,
    kpiGuide: ecommerceKpiGuide,
    workSession: buildBeginnerWorkSession(importResult.report, analysis.questionsForUser),
    dataRequestPlan,
    dataRequestTable: buildDataRequestPlanTsv(dataRequestPlan),
    analysis,
    feishuReply: formatEcommerceAnalysisForFeishu(analysis, "当前导入数据"),
    taskTable: buildOperationalTasksTsv(analysis),
    riskTable: buildProductFindingsTsv(analysis),
    markdownReport: buildWeeklyMarkdownReport(importResult.input, analysis),
  });
}
