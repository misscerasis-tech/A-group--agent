import {
  ArrowRight,
  Bot,
  CheckCircle2,
  CircleHelp,
  FileSpreadsheet,
  MessageSquareText,
  Send,
  TriangleAlert,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { demoWorkspaceContext, ecommerceMetricGuide } from "@/lib/demo-context";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

function formatChange(value: number) {
  const direction = value >= 0 ? "up" : "down";
  return {
    direction,
    label: `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`,
  };
}

function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export default function AgentPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const revenueChange = formatChange(analysis.totals.revenueChangeRate);
  const orderChange = formatChange(analysis.totals.orderChangeRate);
  const conversionChange =
    analysis.totals.conversionRateChange === null
      ? null
      : formatChange(analysis.totals.conversionRateChange);
  const adChange =
    analysis.totals.adReturnChange === null ? null : formatChange(analysis.totals.adReturnChange);

  return (
    <AppShell activePath="/agent" context={demoWorkspaceContext} returnTo="/agent">
      <section className="agent-hero">
        <div>
          <p className="eyebrow">A 组 · 飞书驱动 · 电商运营场景</p>
          <h2>小白电商运营 Agent</h2>
          <p className="muted">
            你给数据，它负责追问、分析、解释和安排下一步。输出不用懂专业术语也能看懂。
          </p>
        </div>
        <div className="agent-scenario">
          <MessageSquareText size={18} aria-hidden="true" />
          <span>飞书里一句话：帮我看看这家店这周经营得怎么样</span>
        </div>
      </section>

      <section className="agent-flow" aria-label="Agent 工作流">
        <div className="flow-step active">
          <Bot size={18} aria-hidden="true" />
          <span>主动追问</span>
        </div>
        <ArrowRight size={16} aria-hidden="true" />
        <div className="flow-step">
          <FileSpreadsheet size={18} aria-hidden="true" />
          <span>读取数据</span>
        </div>
        <ArrowRight size={16} aria-hidden="true" />
        <div className="flow-step">
          <TriangleAlert size={18} aria-hidden="true" />
          <span>发现问题</span>
        </div>
        <ArrowRight size={16} aria-hidden="true" />
        <div className="flow-step">
          <Send size={18} aria-hidden="true" />
          <span>回写飞书</span>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h3>Agent 先问你要什么</h3>
          <div className="chat-stack">
            <div className="chat-line user">帮我看看这家店这周经营得怎么样。</div>
            <div className="chat-line agent">
              可以。我先不直接下结论，需要确认你卖什么、在哪个平台卖，以及有没有销售、库存或广告数据。
            </div>
            {analysis.questionsForUser.slice(0, 4).map((item) => (
              <div className="question-row" key={item.question}>
                <CircleHelp size={16} aria-hidden="true" />
                <div>
                  <strong>{item.question}</strong>
                  <p>{item.whyItMatters}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>本次样例数据</h3>
          <dl className="store-facts">
            <div>
              <dt>店铺</dt>
              <dd>{sampleEcommerceAgentInput.store.storeName}</dd>
            </div>
            <div>
              <dt>平台</dt>
              <dd>{sampleEcommerceAgentInput.store.platform}</dd>
            </div>
            <div>
              <dt>市场</dt>
              <dd>{sampleEcommerceAgentInput.store.market}</dd>
            </div>
            <div>
              <dt>目标</dt>
              <dd>{sampleEcommerceAgentInput.store.goal}</dd>
            </div>
          </dl>
          <div className="data-health">
            {analysis.dataHealth.map((item) => (
              <div className="health-row" key={item}>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel agent-summary">
        <div className="section-heading">
          <div>
            <h3>Agent 用人话讲结论</h3>
            <p className="muted">不是只给数据，而是告诉你现在发生了什么、为什么、先做什么。</p>
          </div>
          <strong>{analysis.headline}</strong>
        </div>

        <div className="grid four">
          <div className="metric-tile">
            <span>本周销售额</span>
            <strong>{formatMoney(analysis.totals.current.revenue)}</strong>
            <small className={revenueChange.direction}>{revenueChange.label}</small>
          </div>
          <div className="metric-tile">
            <span>本周订单</span>
            <strong>{analysis.totals.current.orders} 单</strong>
            <small className={orderChange.direction}>{orderChange.label}</small>
          </div>
          <div className="metric-tile">
            <span>进店后下单</span>
            <strong>{conversionChange ? conversionChange.label : "待补充"}</strong>
            <small>不用背术语：看了以后买不买</small>
          </div>
          <div className="metric-tile">
            <span>广告回本</span>
            <strong>{adChange ? adChange.label : "待补充"}</strong>
            <small>广告花钱有没有换回订单</small>
          </div>
        </div>

        <div className="plain-summary">
          {analysis.plainSummary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="panel metric-guide">
        <div className="section-heading">
          <div>
            <h3>电商一定关注哪些数据</h3>
            <p className="muted">
              首页按“结果、原因、风险、外部压力”的顺序排，不让小白先陷进一堆指标。
            </p>
          </div>
          <strong>先看结果，再找原因，最后安排动作。</strong>
        </div>
        <div className="metric-guide-grid">
          {ecommerceMetricGuide.map((metric) => (
            <article className="metric-guide-card" key={metric.name}>
              <header>
                <span>{metric.priority}</span>
                <h4>{metric.name}</h4>
              </header>
              <p>
                <strong>{metric.plainName}</strong>
              </p>
              <p>{metric.whyItMatters}</p>
              <small>{metric.homepageSignal}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h3>商品问题诊断</h3>
          <div className="card-list">
            {analysis.productFindings.slice(0, 4).map((finding) => (
              <article className="item-card" key={`${finding.sku}-${finding.issue}`}>
                <header>
                  <h4>{finding.productName}</h4>
                  <span className={`priority ${finding.priority}`}>
                    {finding.priority === "high" ? "优先处理" : "继续观察"}
                  </span>
                </header>
                <strong>{finding.issue}</strong>
                <p>{finding.plainReason}</p>
                <p>{finding.suggestedAction}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>竞品动态解释</h3>
          <div className="competitor-list">
            {sampleEcommerceAgentInput.competitors.map((competitor) => (
              <div className="competitor-row" key={competitor.name}>
                <div>
                  <strong>{competitor.name}</strong>
                  <p>{competitor.source} · {competitor.keySellingPoints.join(" / ")}</p>
                </div>
                <div className="competitor-price">
                  <strong>${competitor.price}</strong>
                  <span>{competitor.promotion}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="plain-summary">
            {analysis.competitorInsights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>
        </div>
      </section>

      <section className="grid two">
        <div className="panel">
          <h3>下周行动清单</h3>
          <div className="action-list">
            {analysis.nextActions.map((action, index) => (
              <article className="action-row" key={action.title}>
                <span>{index + 1}</span>
                <div>
                  <h4>{action.title}</h4>
                  <p>{action.reason}</p>
                  <small>
                    负责人：{action.owner} · 第一步：{action.firstStep}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="panel feishu-preview">
          <h3>飞书回写预览</h3>
          <pre>{analysis.feishuReply}</pre>
          <div className="health-row">
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>下一步接真实飞书机器人后，这段会自动发到群或文档。</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
