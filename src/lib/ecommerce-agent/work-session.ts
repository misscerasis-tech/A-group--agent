import type { EcommerceCsvImportReport } from "./csv-import";

export type BeginnerWorkStepStatus = "done" | "agent_can_run" | "needs_user" | "later";

export type BeginnerWorkStep = {
  title: string;
  status: BeginnerWorkStepStatus;
  userAction: string;
  agentAction: string;
  output: string;
};

export type BeginnerWorkSession = {
  title: string;
  nextQuestion: string;
  steps: BeginnerWorkStep[];
};

function statusLabel(status: BeginnerWorkStepStatus) {
  const labels: Record<BeginnerWorkStepStatus, string> = {
    done: "已完成",
    agent_can_run: "Agent 可继续",
    needs_user: "等用户补充",
    later: "后续处理",
  };

  return labels[status];
}

export function formatBeginnerWorkSessionForFeishu(session: BeginnerWorkSession) {
  return [
    session.title,
    "",
    `下一句我会问你：${session.nextQuestion}`,
    "",
    ...session.steps.map(
      (step, index) =>
        `${index + 1}. ${step.title}（${statusLabel(step.status)}）\n用户动作：${step.userAction}\nAgent 动作：${step.agentAction}\n输出：${step.output}`,
    ),
  ].join("\n");
}

export function buildBeginnerWorkSession(report?: EcommerceCsvImportReport): BeginnerWorkSession {
  const missingRequired =
    report?.fieldMappings
      .filter((field) => field.required && !field.sourceHeader)
      .map((field) => field.label) ?? [];
  const hasMetrics = (report?.metricsRows ?? 0) > 0;
  const hasCompetitors = (report?.competitorRows ?? 0) > 0;
  const canAnalyze = Boolean(report?.ok);
  const warningQuestions = report?.questionsForUser ?? [];

  const nextQuestion = !hasMetrics
    ? "你能先给我一份经营数据 CSV 吗？最少要有周期、商品名称、订单数、销售额和销量。"
    : missingRequired.length > 0
      ? `我先需要你补这几个字段：${missingRequired.join("、")}。`
      : warningQuestions[0] ?? "这周你更想保销量，还是更想保利润？";

  return {
    title: "我会这样带你把电商运营复盘做完：",
    nextQuestion,
    steps: [
      {
        title: "确认店铺背景",
        status: "done",
        userAction: "告诉我店铺名称、平台、市场、类目和这周目标。",
        agentAction: "把这些信息当成判断上下文，不拿通用模板硬套。",
        output: "明确本次复盘到底服务哪个店、哪个市场、哪个目标。",
      },
      {
        title: "读经营数据",
        status: canAnalyze ? "done" : hasMetrics ? "needs_user" : "needs_user",
        userAction:
          missingRequired.length > 0
            ? `补齐 ${missingRequired.join("、")}。`
            : "上传或粘贴平台导出的经营 CSV。",
        agentAction: "识别字段、检查上周和本周是否都有数据，缺字段时直接追问。",
        output: canAnalyze ? "可以生成本周复盘。" : "先得到一份可分析的数据表。",
      },
      {
        title: "补风险数据",
        status: warningQuestions.length > 0 ? "needs_user" : "done",
        userAction:
          warningQuestions.length > 0
            ? warningQuestions.slice(0, 2).join(" ")
            : "暂时不用补，当前关键风险字段已经够用。",
        agentAction: "把缺少的流量、广告、库存、毛利或竞品数据标成不确定项。",
        output: "避免把缺失数据编成确定结论。",
      },
      {
        title: "生成复盘和行动清单",
        status: canAnalyze ? "agent_can_run" : "later",
        userAction: canAnalyze ? "点击生成复盘，或在飞书里发“帮我看本周经营情况”。" : "先补齐经营数据。",
        agentAction: "判断销售、订单、转化、广告、利润、库存和竞品压力。",
        output: "给出人话结论、风险商品、下周行动和待追问问题。",
      },
      {
        title: "回写飞书沉淀结果",
        status: canAnalyze ? "agent_can_run" : "later",
        userAction: hasCompetitors ? "确认要发到单聊、群聊还是文档。" : "补竞品后再决定是否沉淀完整周报。",
        agentAction: "把复盘压缩成飞书消息，也能输出飞书文档 Markdown。",
        output: "让团队能在飞书里继续分工，而不是只看网页演示。",
      },
    ],
  };
}
