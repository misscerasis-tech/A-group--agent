"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  FileUp,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { analyzeEcommerceStore } from "../../lib/ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../../lib/ecommerce-agent/csv-import";
import { buildWeeklyMarkdownReport } from "../../lib/ecommerce-agent/report";
import { buildBeginnerWorkSession } from "../../lib/ecommerce-agent/work-session";
import { formatEcommerceAnalysisForFeishu } from "../../lib/integrations/feishu/agent-reply";

const starterMetricsCsv = [
  "week,start_date,end_date,product_name,sku,visitors,orders,revenue,units_sold,ad_spend,ad_revenue,inventory,gross_profit,refund_orders,refund_amount,refund_reason",
  "previous,2026-07-06,2026-07-12,Aurora Cup 黑色 500ml,CUP-BLACK-500,4200,168,6048,176,1320,3960,320,2419,5,180,杯盖漏水 / 温控不准",
  "current,2026-07-13,2026-07-19,Aurora Cup 黑色 500ml,CUP-BLACK-500,4380,122,4392,128,1510,2920,118,878,4,160,杯盖漏水 / 物流慢",
].join("\n");

const platformHeaderMetricsTable = [
  "周期,商品名称,商家编码,商品访客数,支付买家数,商品支付金额,支付商品件数,消耗,直接成交金额,可售件数,成本金额,毛利额,退款成功单数,退款成功金额,退款原因",
  "上周,Aurora Cup 黑色 500ml,CUP-BLACK-500,4200,168,6048,176,1320,3960,320,3629,2419,5,180,杯盖漏水 / 温控不准",
  "本周,Aurora Cup 黑色 500ml,CUP-BLACK-500,4380,122,4392,128,1510,2920,118,3514,878,4,160,杯盖漏水 / 物流慢",
].join("\n");

const orderDetailMetricsTable = [
  "订单号,支付时间,商品名称,商家编码,购买数量,实付金额,退款金额,售后状态",
  "O-1001,2026-07-08 10:11:00,Aurora Cup 黑色 500ml,CUP-BLACK-500,2,79.8,,已完成",
  "O-1002,2026-07-09 12:30:00,Aurora Cup 黑色 500ml,CUP-BLACK-500,1,39.9,0,已完成",
  "O-1003,2026-07-15 09:20:00,Aurora Cup 黑色 500ml,CUP-BLACK-500,1,39.9,39.9,已退款",
  "O-1004,2026-07-16 19:45:00,Aurora Cup 白色 500ml,CUP-WHITE-500,3,119.7,,已完成",
].join("\n");

const starterCompetitorCsv = [
  "name,url,source,observed_at,price,promotion,rating,reviews,key_selling_points",
  "Ember Travel Mug 2,https://ember.com/products/ember-travel-mug-2,Ember 官方商品页,2026-07-22,199.95,高端温控旅行杯,4.7,12000,精确温控 / App 控制 / 旅行场景",
].join("\n");

const starterInventoryCsv = [
  "product_name,sku,inventory,observed_at",
  "Aurora Cup 黑色 500ml,CUP-BLACK-500,118,2026-07-19",
  "Aurora Cup 白色 500ml,CUP-WHITE-500,206,2026-07-19",
  "Aurora Cup 礼盒套装,CUP-GIFT-SET,42,2026-07-19",
].join("\n");

const starterCustomerVoiceCsv = [
  "product_name,sku,source,observed_at,sentiment,theme,text,count",
  "Aurora Cup 黑色 500ml,CUP-BLACK-500,客服售后备注,2026-07-19,negative,杯盖漏水,用户反馈通勤路上杯盖会渗水，要求退货,4",
  "Aurora Cup 白色 500ml,CUP-WHITE-500,商品评价,2026-07-19,negative,颜色有色差,评价里提到实物颜色比页面偏黄,3",
].join("\n");

const importDraftStorageKey = "a-group-ecommerce-agent-import-draft-v1";
const defaultStoreGoal = "同时看销量、利润、广告回本、库存风险、退款/退货和竞品压力";

type ImportDraft = {
  storeName?: string;
  platform?: string;
  market?: string;
  category?: string;
  goal?: string;
  metricsCsv?: string;
  competitorCsv?: string;
  inventoryCsv?: string;
  customerVoicesCsv?: string;
};

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function formatWorkStepStatus(status: string) {
  const labels: Record<string, string> = {
    done: "已完成",
    agent_can_run: "Agent 可继续",
    needs_user: "等你补充",
    later: "后续处理",
  };

  return labels[status] ?? status;
}

async function readFileIntoState(
  event: React.ChangeEvent<HTMLInputElement>,
  setValue: (value: string) => void,
) {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  setValue(await file.text());
  event.target.value = "";
}

export function DataImportPanel() {
  const [storeName, setStoreName] = useState("Aurora Cup 独立站");
  const [platform, setPlatform] = useState("Shopify");
  const [market, setMarket] = useState("美国");
  const [category, setCategory] = useState("智能温控/温显旅行杯");
  const [goal, setGoal] = useState(defaultStoreGoal);
  const [metricsCsv, setMetricsCsv] = useState(starterMetricsCsv);
  const [competitorCsv, setCompetitorCsv] = useState(starterCompetitorCsv);
  const [inventoryCsv, setInventoryCsv] = useState(starterInventoryCsv);
  const [customerVoicesCsv, setCustomerVoicesCsv] = useState(starterCustomerVoiceCsv);
  const [hasRun, setHasRun] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<"feishu" | "markdown" | null>(null);

  function loadStarterSample() {
    setStoreName("Aurora Cup 独立站");
    setPlatform("Shopify");
    setMarket("美国");
    setCategory("智能温控/温显旅行杯");
    setGoal(defaultStoreGoal);
    setMetricsCsv(starterMetricsCsv);
    setCompetitorCsv(starterCompetitorCsv);
    setInventoryCsv(starterInventoryCsv);
    setCustomerVoicesCsv(starterCustomerVoiceCsv);
    setHasRun(false);
  }

  function loadPlatformHeaderSample() {
    setStoreName("平台导出表测试店");
    setPlatform("抖音电商 / 淘系 / Amazon 均可替换");
    setMarket("待确认市场");
    setCategory("待确认类目");
    setGoal(defaultStoreGoal);
    setMetricsCsv(platformHeaderMetricsTable);
    setCompetitorCsv(starterCompetitorCsv);
    setInventoryCsv(starterInventoryCsv);
    setCustomerVoicesCsv(starterCustomerVoiceCsv);
    setHasRun(false);
  }

  function loadOrderDetailSample() {
    setStoreName("订单明细测试店");
    setPlatform("Shopify / Amazon / 抖音电商均可替换");
    setMarket("待确认市场");
    setCategory("待确认类目");
    setGoal(defaultStoreGoal);
    setMetricsCsv(orderDetailMetricsTable);
    setCompetitorCsv(starterCompetitorCsv);
    setInventoryCsv(starterInventoryCsv);
    setCustomerVoicesCsv(starterCustomerVoiceCsv);
    setHasRun(false);
  }

  function clearImportDraft() {
    setMetricsCsv("");
    setCompetitorCsv("");
    setInventoryCsv("");
    setCustomerVoicesCsv("");
    setHasRun(false);
    window.localStorage.removeItem(importDraftStorageKey);
  }

  async function copyOutput(target: "feishu" | "markdown", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedTarget(target);
      window.setTimeout(() => setCopiedTarget(null), 1600);
    } catch {
      setCopiedTarget(null);
    }
  }

  useEffect(() => {
    try {
      const savedDraft = window.localStorage.getItem(importDraftStorageKey);

      if (savedDraft) {
        const draft = JSON.parse(savedDraft) as ImportDraft;

        setStoreName(draft.storeName ?? "Aurora Cup 独立站");
        setPlatform(draft.platform ?? "Shopify");
        setMarket(draft.market ?? "美国");
        setCategory(draft.category ?? "智能温控/温显旅行杯");
        setGoal(draft.goal ?? defaultStoreGoal);
        setMetricsCsv(draft.metricsCsv ?? starterMetricsCsv);
        setCompetitorCsv(draft.competitorCsv ?? starterCompetitorCsv);
        setInventoryCsv(draft.inventoryCsv ?? starterInventoryCsv);
        setCustomerVoicesCsv(draft.customerVoicesCsv ?? starterCustomerVoiceCsv);
      }
    } catch {
      window.localStorage.removeItem(importDraftStorageKey);
    } finally {
      setHasLoadedDraft(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedDraft) {
      return;
    }

    const draft: ImportDraft = {
      storeName,
      platform,
      market,
      category,
      goal,
      metricsCsv,
      competitorCsv,
      inventoryCsv,
      customerVoicesCsv,
    };

    window.localStorage.setItem(importDraftStorageKey, JSON.stringify(draft));
  }, [
    category,
    competitorCsv,
    customerVoicesCsv,
    goal,
    hasLoadedDraft,
    inventoryCsv,
    market,
    metricsCsv,
    platform,
    storeName,
  ]);

  const importResult = useMemo(
    () =>
      buildEcommerceInputFromCsv({
        metricsCsv,
        competitorsCsv: competitorCsv,
        inventoryCsv,
        customerVoicesCsv,
        store: {
          storeName,
          platform,
          market,
          category,
          goal,
        },
      }),
    [category, competitorCsv, customerVoicesCsv, goal, inventoryCsv, market, metricsCsv, platform, storeName],
  );
  const analysis = importResult.input ? analyzeEcommerceStore(importResult.input) : null;
  const markdownReport =
    importResult.input && analysis ? buildWeeklyMarkdownReport(importResult.input, analysis) : "";
  const feishuReplyText = analysis ? formatEcommerceAnalysisForFeishu(analysis, "当前导入数据") : "";
  const requiredMappings = importResult.report.fieldMappings.filter((field) => field.required);
  const workSession = buildBeginnerWorkSession(importResult.report, analysis?.questionsForUser ?? []);

  return (
    <section className="panel import-workbench">
      <div className="section-heading">
        <div>
          <h3>真实数据导入工作台</h3>
          <p className="muted">先把平台导出的表给我，我会识别字段、追问缺口，再用人话产出复盘。</p>
        </div>
        <strong>{importResult.report.ok ? "这份数据已经可以分析。" : "这份数据还需要补字段。"}</strong>
      </div>

      <div className="import-grid">
        <div className="import-inputs">
          <div className="grid two compact-form-grid">
            <label className="form-row">
              <span className="field-label">店铺名称</span>
              <input value={storeName} onChange={(event) => setStoreName(event.target.value)} />
            </label>
            <label className="form-row">
              <span className="field-label">平台</span>
              <input value={platform} onChange={(event) => setPlatform(event.target.value)} />
            </label>
            <label className="form-row">
              <span className="field-label">市场</span>
              <input value={market} onChange={(event) => setMarket(event.target.value)} />
            </label>
            <label className="form-row">
              <span className="field-label">类目</span>
              <input value={category} onChange={(event) => setCategory(event.target.value)} />
            </label>
            <label className="form-row wide">
              <span className="field-label">本周目标</span>
              <input
                list="ecommerce-goal-options"
                value={goal}
                onChange={(event) => setGoal(event.target.value)}
              />
              <datalist id="ecommerce-goal-options">
                <option value="同时看销量、利润、广告回本、库存风险、退款/退货和竞品压力" />
                <option value="这周先保利润" />
                <option value="这周先保销量" />
                <option value="这周先降低退款/退货" />
                <option value="先看库存风险" />
                <option value="先看广告回本" />
              </datalist>
            </label>
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <Database size={16} aria-hidden="true" />
                经营数据表
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,.md,.markdown,text/csv,text/tab-separated-values,text/markdown,text/plain"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setMetricsCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="经营数据 CSV、TSV、Markdown 或复制表格"
              spellCheck={false}
              value={metricsCsv}
              onChange={(event) => setMetricsCsv(event.target.value)}
            />
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <ClipboardList size={16} aria-hidden="true" />
                竞品数据表
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,.md,.markdown,text/csv,text/tab-separated-values,text/markdown,text/plain"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setCompetitorCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="竞品数据 CSV、TSV、Markdown 或复制表格"
              spellCheck={false}
              value={competitorCsv}
              onChange={(event) => setCompetitorCsv(event.target.value)}
            />
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <Database size={16} aria-hidden="true" />
                库存快照表
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,.md,.markdown,text/csv,text/tab-separated-values,text/markdown,text/plain"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setInventoryCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="库存快照 CSV、TSV、Markdown 或复制表格"
              spellCheck={false}
              value={inventoryCsv}
              onChange={(event) => setInventoryCsv(event.target.value)}
            />
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <ClipboardList size={16} aria-hidden="true" />
                用户声音/售后评价表
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,.md,.markdown,text/csv,text/tab-separated-values,text/markdown,text/plain"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setCustomerVoicesCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="用户声音、客服备注、评价或售后文本 CSV、TSV、Markdown"
              spellCheck={false}
              value={customerVoicesCsv}
              onChange={(event) => setCustomerVoicesCsv(event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="button" type="button" onClick={() => setHasRun(true)}>
              <PlayCircle size={16} aria-hidden="true" />
              生成复盘
            </button>
            <button className="button secondary" type="button" onClick={loadStarterSample}>
              <Database size={16} aria-hidden="true" />
              演示样例
            </button>
            <button className="button secondary" type="button" onClick={loadPlatformHeaderSample}>
              <ClipboardList size={16} aria-hidden="true" />
              平台表头样例
            </button>
            <button className="button secondary" type="button" onClick={loadOrderDetailSample}>
              <ClipboardList size={16} aria-hidden="true" />
              订单明细样例
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={clearImportDraft}
            >
              <Trash2 size={16} aria-hidden="true" />
              清空
            </button>
          </div>
        </div>

        <div className="import-output">
          <div className="import-status work-session-panel">
            <h4>Agent 接手步骤</h4>
            <p className="next-question">{workSession.nextQuestion}</p>
            <div className="work-session-list">
              {workSession.steps.map((step) => (
                <article className={`work-step ${step.status}`} key={step.title}>
                  <header>
                    <strong>{step.title}</strong>
                    <span>{formatWorkStepStatus(step.status)}</span>
                  </header>
                  <p>{step.userAction}</p>
                  <small>{step.output}</small>
                </article>
              ))}
            </div>
          </div>

          <div className="import-status">
            <h4>字段识别</h4>
            <div className="mapping-list">
              {requiredMappings.map((field) => (
                <div className={field.sourceHeader ? "mapping-row ok" : "mapping-row missing"} key={field.canonicalField}>
                  {field.sourceHeader ? (
                    <CheckCircle2 size={15} aria-hidden="true" />
                  ) : (
                    <AlertTriangle size={15} aria-hidden="true" />
                  )}
                  <span>{field.label}</span>
                  <small>{field.sourceHeader ?? "未识别"}</small>
                </div>
              ))}
            </div>
          </div>

          {importResult.report.issues.length > 0 ? (
            <div className="import-status">
              <h4>我会先提醒你</h4>
              <div className="issue-list">
                {importResult.report.issues.slice(0, 5).map((issue) => (
                  <p className={issue.severity} key={`${issue.message}-${issue.rowNumber ?? "all"}`}>
                    {issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}
                    {issue.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {!hasRun ? (
            <div className="state-box compact">
              <h2>等待生成</h2>
              <p>导入后点击生成复盘，右侧会显示 Agent 的判断、追问和飞书回写文本。</p>
            </div>
          ) : analysis ? (
            <div className="import-analysis">
              <h4>{analysis.headline}</h4>
              <div className="grid three import-metrics">
                <div>
                  <span>销售额</span>
                  <strong>{formatMoney(analysis.totals.current.revenue)}</strong>
                </div>
                <div>
                  <span>订单</span>
                  <strong>{analysis.totals.current.orders} 单</strong>
                </div>
                <div>
                  <span>风险商品</span>
                  <strong>{analysis.productFindings.length} 个</strong>
                </div>
              </div>
              <div className="plain-summary">
                {analysis.plainSummary.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <div className="button-row">
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void copyOutput("feishu", feishuReplyText)}
                >
                  {copiedTarget === "feishu" ? (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  ) : (
                    <Copy size={16} aria-hidden="true" />
                  )}
                  {copiedTarget === "feishu" ? "已复制飞书回复" : "复制飞书回复"}
                </button>
                <button
                  className="button secondary"
                  type="button"
                  onClick={() => void copyOutput("markdown", markdownReport)}
                >
                  {copiedTarget === "markdown" ? (
                    <CheckCircle2 size={16} aria-hidden="true" />
                  ) : (
                    <Copy size={16} aria-hidden="true" />
                  )}
                  {copiedTarget === "markdown" ? "已复制 Markdown" : "复制 Markdown"}
                </button>
              </div>
              <details className="report-details">
                <summary>飞书文档 Markdown</summary>
                <pre>{markdownReport}</pre>
              </details>
              <pre>{feishuReplyText}</pre>
            </div>
          ) : (
            <div className="state-box error compact">
              <h2>还不能分析</h2>
              <p>{importResult.report.questionsForUser.slice(0, 3).join(" ")}</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
