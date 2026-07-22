"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
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
  "week,start_date,end_date,product_name,sku,visitors,orders,revenue,units_sold,ad_spend,ad_revenue,inventory,gross_profit",
  "previous,2026-07-06,2026-07-12,Aurora Cup 黑色 500ml,CUP-BLACK-500,4200,168,6048,176,1320,3960,320,2419",
  "current,2026-07-13,2026-07-19,Aurora Cup 黑色 500ml,CUP-BLACK-500,4380,122,4392,128,1510,2920,118,878",
].join("\n");

const starterCompetitorCsv = [
  "name,url,source,observed_at,price,promotion,rating,reviews,key_selling_points",
  "Ember Travel Mug 2,https://ember.com/products/ember-travel-mug-2,Ember 官方商品页,2026-07-22,199.95,高端温控旅行杯,4.7,12000,精确温控 / App 控制 / 旅行场景",
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
  const [hasRun, setHasRun] = useState(false);
  const [hasLoadedDraft, setHasLoadedDraft] = useState(false);

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
    };

    window.localStorage.setItem(importDraftStorageKey, JSON.stringify(draft));
  }, [category, competitorCsv, goal, hasLoadedDraft, market, metricsCsv, platform, storeName]);

  const importResult = useMemo(
    () =>
      buildEcommerceInputFromCsv({
        metricsCsv,
        competitorsCsv: competitorCsv,
        store: {
          storeName,
          platform,
          market,
          category,
          goal,
        },
      }),
    [category, competitorCsv, goal, market, metricsCsv, platform, storeName],
  );
  const analysis = importResult.input ? analyzeEcommerceStore(importResult.input) : null;
  const markdownReport =
    importResult.input && analysis ? buildWeeklyMarkdownReport(importResult.input, analysis) : "";
  const requiredMappings = importResult.report.fieldMappings.filter((field) => field.required);
  const workSession = useMemo(
    () => buildBeginnerWorkSession(importResult.report),
    [importResult.report],
  );

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
                <option value="先看库存风险" />
                <option value="先看广告回本" />
              </datalist>
            </label>
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <Database size={16} aria-hidden="true" />
                经营数据 CSV/TSV
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setMetricsCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="经营数据 CSV 或 TSV"
              spellCheck={false}
              value={metricsCsv}
              onChange={(event) => setMetricsCsv(event.target.value)}
            />
          </div>

          <div className="csv-box">
            <div className="csv-box-header">
              <span>
                <ClipboardList size={16} aria-hidden="true" />
                竞品数据 CSV/TSV
              </span>
              <label className="button secondary file-button">
                <FileUp size={16} aria-hidden="true" />
                上传
                <input
                  accept=".csv,.tsv,text/csv,text/tab-separated-values"
                  type="file"
                  onChange={(event) => void readFileIntoState(event, setCompetitorCsv)}
                />
              </label>
            </div>
            <textarea
              aria-label="竞品数据 CSV 或 TSV"
              spellCheck={false}
              value={competitorCsv}
              onChange={(event) => setCompetitorCsv(event.target.value)}
            />
          </div>

          <div className="button-row">
            <button className="button" type="button" onClick={() => setHasRun(true)}>
              <PlayCircle size={16} aria-hidden="true" />
              生成复盘
            </button>
            <button
              className="button secondary"
              type="button"
              onClick={() => {
                setMetricsCsv("");
                setCompetitorCsv("");
                setHasRun(false);
                window.localStorage.removeItem(importDraftStorageKey);
              }}
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
              <details className="report-details">
                <summary>飞书文档 Markdown</summary>
                <pre>{markdownReport}</pre>
              </details>
              <pre>{formatEcommerceAnalysisForFeishu(analysis, "当前导入数据")}</pre>
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
