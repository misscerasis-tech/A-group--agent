import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoWorkspaceContext } from "@/lib/demo-context";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import {
  buildOperationalWorkspace,
  operationalPriorityLabel,
} from "@/lib/ecommerce-agent/operational-workspace";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

export default function RemindersPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

  return (
    <AppShell activePath="/reminders" context={demoWorkspaceContext} returnTo="/reminders">
      <section className="page-header">
        <div>
          <h2>风险提醒</h2>
          <p className="muted">
            Agent 把商品异常、数据缺口和待办超时整理成提醒规则，后续可以直接接到飞书机器人。
          </p>
        </div>
        <Link className="button" href="/calendar">
          查看运营计划
        </Link>
      </section>

      <section className="grid two">
        {workspace.reminders.map((rule) => (
          <article className="item-card" key={rule.title}>
            <header>
              <h4>{rule.title}</h4>
              <StatusBadge
                label={operationalPriorityLabel(rule.level)}
                tone={rule.level === "high" ? "warning" : "neutral"}
              />
            </header>
            <p>触发：{rule.trigger}</p>
            <p>原因：{rule.why}</p>
            <strong>提醒后动作：{rule.action}</strong>
          </article>
        ))}
      </section>

      <section className="panel agent-summary">
        <div className="section-heading">
          <div>
            <h3>飞书提醒口径</h3>
            <p className="muted">提醒不只是报警，还要告诉负责人下一步怎么做。</p>
          </div>
          <strong>{analysis.operationalTasks.length} 条运营待办可转成飞书提醒。</strong>
        </div>
        <div className="action-list">
          {analysis.operationalTasks.map((task, index) => (
            <article className="action-row" key={task.id}>
              <span>{index + 1}</span>
              <div>
                <h4>{task.title}</h4>
                <p>{task.reason}</p>
                <small>
                  {task.owner} · {task.dueLabel} · {task.acceptanceCriteria}
                </small>
              </div>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
