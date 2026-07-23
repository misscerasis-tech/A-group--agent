import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoWorkspaceContext } from "@/lib/demo-context";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import { buildOperationalWorkspace } from "@/lib/ecommerce-agent/operational-workspace";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

export default function RecapsPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

  return (
    <AppShell activePath="/recaps" context={demoWorkspaceContext} returnTo="/recaps">
      <section className="page-header">
        <div>
          <h2>经营复盘</h2>
          <p className="muted">
            复盘页把指标变成自然语言：先告诉你结果，再解释原因，最后落到要追问和要执行的动作。
          </p>
        </div>
        <Link className="button" href="/packages">
          查看周报包
        </Link>
      </section>

      <section className="panel agent-summary">
        <div className="section-heading">
          <div>
            <h3>本周一句话结论</h3>
            <p className="muted">这段会作为飞书周报和群消息的开头。</p>
          </div>
          <strong>{analysis.headline}</strong>
        </div>
        <div className="plain-summary">
          {analysis.plainSummary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>

      <section className="grid three">
        {workspace.recapMetrics.map((metric) => (
          <article className="metric-guide-card" key={metric.name}>
            <header>
              <h4>{metric.name}</h4>
              <span>{metric.change}</span>
            </header>
            <p>
              上周 {metric.previous}，本周 {metric.current}
            </p>
            <small>{metric.plainMeaning}</small>
          </article>
        ))}
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>还要追问什么</h3>
          <div className="card-list">
            {analysis.questionsForUser.map((question) => (
              <article className="item-card" key={question.question}>
                <header>
                  <h4>{question.question}</h4>
                  <StatusBadge label="补了会更准" tone="warning" />
                </header>
                <p>{question.whyItMatters}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>复盘后直接安排</h3>
          <div className="action-list">
            {analysis.operationalTasks.map((task, index) => (
              <article className="action-row" key={task.id}>
                <span>{index + 1}</span>
                <div>
                  <h4>{task.title}</h4>
                  <p>{task.reason}</p>
                  <small>
                    {task.owner} · {task.dueLabel} · {task.firstStep}
                  </small>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </AppShell>
  );
}
