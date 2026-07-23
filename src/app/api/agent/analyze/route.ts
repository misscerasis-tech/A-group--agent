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
import { ecommerceTableTemplates } from "@/lib/ecommerce-agent/table-templates";
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

const csvFieldNames = [
  "metricsCsv",
  "competitorsCsv",
  "customerVoicesCsv",
  "inventoryCsv",
  "adsCsv",
] as const;
const storeStringFieldNames = ["storeName", "platform", "market", "category", "goal"] as const;
const storeUserLevels = ["beginner", "operator", "leader"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getOptionalStringField(source: Record<string, unknown>, fieldName: string) {
  const value = source[fieldName];

  if (value === undefined || value === null) {
    return {
      value: undefined,
    };
  }

  if (typeof value !== "string") {
    return {
      error: `${fieldName} 需要是字符串。`,
    };
  }

  return {
    value,
  };
}

function parseStoreProfile(value: unknown) {
  if (value === undefined || value === null) {
    return {
      store: undefined,
    };
  }

  if (!isRecord(value)) {
    return {
      error: "store 需要是对象。",
    };
  }

  const store: Partial<StoreProfile> = {};

  for (const fieldName of storeStringFieldNames) {
    const parsed = getOptionalStringField(value, fieldName);

    if (parsed.error) {
      return {
        error: `store.${parsed.error}`,
      };
    }

    if (parsed.value) {
      store[fieldName] = parsed.value;
    }
  }

  const parsedUserLevel = getOptionalStringField(value, "userLevel");

  if (parsedUserLevel.error) {
    return {
      error: `store.${parsedUserLevel.error}`,
    };
  }

  if (parsedUserLevel.value) {
    if (!storeUserLevels.includes(parsedUserLevel.value as StoreProfile["userLevel"])) {
      return {
        error: "store.userLevel 只能是 beginner、operator 或 leader。",
      };
    }

    store.userLevel = parsedUserLevel.value as StoreProfile["userLevel"];
  }

  return {
    store,
  };
}

function parseAnalyzeRequestBody(value: unknown) {
  if (!isRecord(value)) {
    return {
      error: "请求体需要是 JSON 对象。",
    };
  }

  const body: AnalyzeRequestBody = {};

  for (const fieldName of csvFieldNames) {
    const parsed = getOptionalStringField(value, fieldName);

    if (parsed.error) {
      return {
        error: parsed.error,
      };
    }

    body[fieldName] = parsed.value;
  }

  const parsedStore = parseStoreProfile(value.store);

  if (parsedStore.error) {
    return {
      error: parsedStore.error,
    };
  }

  body.store = parsedStore.store;

  return {
    body,
  };
}

export async function POST(request: Request) {
  let body: AnalyzeRequestBody;

  try {
    const parsed = parseAnalyzeRequestBody(await request.json());

    if (!parsed.body) {
      const dataRequestPlan = buildDataRequestPlan();

      return NextResponse.json(
        {
          error: parsed.error,
          kpiGuide: ecommerceKpiGuide,
          tableTemplates: ecommerceTableTemplates,
          workSession: buildBeginnerWorkSession(),
          dataRequestPlan,
          dataRequestTable: buildDataRequestPlanTsv(dataRequestPlan),
        },
        { status: 400 },
      );
    }

    body = parsed.body;
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
        tableTemplates: ecommerceTableTemplates,
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
        tableTemplates: ecommerceTableTemplates,
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
    tableTemplates: ecommerceTableTemplates,
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
