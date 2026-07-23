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

export default function CalendarPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

  return (
    <AppShell activePath="/calendar" context={demoWorkspaceContext} returnTo="/calendar">
      <section className="page-header">
        <div>
          <h2>运营计划</h2>
          <p className="muted">
            Agent 把复盘结论拆成一周内能执行的安排：先处理高风险，再补数据，最后沉淀周报。
          </p>
        </div>
        <Link className="button" href="/agent">
          回到运营 Agent
        </Link>
      </section>

      <section className="grid two">
        {workspace.calendar.map((item) => (
          <article className="item-card" key={`${item.slot}-${item.title}`}>
            <header>
              <div>
                <h3>{item.slot}</h3>
                <h4>{item.title}</h4>
              </div>
              <StatusBadge label={operationalPriorityLabel(item.priority)} tone={item.priority === "high" ? "warning" : "neutral"} />
            </header>
            <p>{item.objective}</p>
            <p>
              负责人：{item.owner}。先做：{item.input}
            </p>
            <small>完成标准：{item.output}</small>
          </article>
        ))}
      </section>

      <section className="panel agent-summary">
        <div className="section-heading">
          <div>
            <h3>排期依据</h3>
            <p className="muted">排期来自本周经营分析，不是固定模板。</p>
          </div>
          <strong>{analysis.headline}</strong>
        </div>
        <div className="plain-summary">
          {analysis.plainSummary.slice(0, 3).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
