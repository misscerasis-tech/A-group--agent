import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  demoProducts,
  demoProject,
  demoWorkspaceContext,
  ecommerceKpiGuide,
} from "@/lib/demo-context";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

function formatMoney(value: number) {
  return value.toLocaleString("zh-CN", { maximumFractionDigits: 0 });
}

function formatPercent(value: number) {
  return `${value >= 0 ? "+" : "-"}${Math.abs(value * 100).toFixed(1)}%`;
}

export default function DashboardPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const criticalFindings = analysis.productFindings.filter(
    (finding) => finding.priority === "high",
  );

  return (
    <AppShell activePath="/dashboard" context={demoWorkspaceContext} returnTo="/dashboard">
      <section className="page-header">
        <div>
          <h2>经营概览</h2>
          <p className="muted">
            这里展示 Agent 已经判断出的经营结果、关键风险和下一步动作，不需要连接数据库也能演示。
          </p>
        </div>
        <Link className="button" href="/agent">
          回到运营 Agent
        </Link>
      </section>

      <section className="grid four">
        <div className="panel stat">
          <span className="muted">本周销售额</span>
          <strong>{formatMoney(analysis.totals.current.revenue)}</strong>
          <small className="down">
            {formatPercent(analysis.totals.revenueChangeRate)} · 金额单位按原表理解
          </small>
        </div>
        <div className="panel stat">
          <span className="muted">本周订单</span>
          <strong>{analysis.totals.current.orders} 单</strong>
          <small className="down">{formatPercent(analysis.totals.orderChangeRate)}</small>
        </div>
        <div className="panel stat">
          <span className="muted">高优先级问题</span>
          <strong>{criticalFindings.length}</strong>
          <small>需要本周处理</small>
        </div>
        <div className="panel stat">
          <span className="muted">已观察竞品</span>
          <strong>{sampleEcommerceAgentInput.competitors.length}</strong>
          <small>公开商品页信号</small>
        </div>
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>当前复盘项目</h3>
          <article className="item-card">
            <header>
              <h4>{demoProject.name}</h4>
              <StatusBadge label="进行中" tone="success" />
            </header>
            <p>{demoProject.description}</p>
            <p>已关联 {demoProject.linkedProducts} 个商品。</p>
          </article>
        </div>

        <div className="panel">
          <h3>重点商品</h3>
          <div className="card-list">
            {demoProducts.map((product) => (
              <article className="item-card" key={product.id}>
                <header>
                  <h4>{product.name}</h4>
                  <StatusBadge label="启用" tone="success" />
                </header>
                <p>{product.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="panel metric-guide" style={{ marginTop: 16 }}>
        <div className="section-heading">
          <div>
            <h3>首页怎么体现指标重要性</h3>
            <p className="muted">
              不按表格字段排序，而按经营判断顺序排序：先看结果，再找原因，再看风险和竞品。
            </p>
          </div>
          <strong>红色变化和“优先处理”代表 Agent 认为需要先动手。</strong>
        </div>
        <div className="metric-guide-grid compact">
          {ecommerceKpiGuide.slice(0, 6).map((metric) => (
            <article className="metric-guide-card" key={metric.name}>
              <header>
                <span>{metric.priority}</span>
                <h4>{metric.name}</h4>
              </header>
              <p>{metric.homepageSignal}</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
