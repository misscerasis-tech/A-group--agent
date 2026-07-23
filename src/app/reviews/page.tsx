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

export default function ReviewsPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

  return (
    <AppShell activePath="/reviews" context={demoWorkspaceContext} returnTo="/reviews">
      <section className="page-header">
        <div>
          <h2>审核中心</h2>
          <p className="muted">
            Agent 可以提出动作，但不会擅自改价、停广告或调整库存；这些都先进入人工确认队列。
          </p>
        </div>
        <Link className="button" href="/agent">
          重新生成复盘
        </Link>
      </section>

      <section className="grid two">
        {workspace.reviewQueue.map((item) => (
          <article className="item-card" key={`${item.title}-${item.owner}`}>
            <header>
              <div>
                <h4>{item.title}</h4>
                <p>{item.owner}</p>
              </div>
              <StatusBadge
                label={operationalPriorityLabel(item.priority)}
                tone={item.priority === "high" ? "warning" : "neutral"}
              />
            </header>
            <strong>{item.decisionNeeded}</strong>
            <p>{item.reason}</p>
            <p>第一步：{item.nextStep}</p>
          </article>
        ))}
      </section>

      <section className="panel agent-summary">
        <div className="section-heading">
          <div>
            <h3>审核边界</h3>
            <p className="muted">真实工作助手可以推进判断，但需要把高风险动作留给人确认。</p>
          </div>
          <strong>自动生成建议，人工确认执行。</strong>
        </div>
        <div className="plain-summary">
          <p>改价、跟促销、暂停广告、补货控量和用户承诺变更，都应该先进入审核。</p>
          <p>竞品价格只作为观察快照，真正调整价格前必须打开原链接复核。</p>
          <p>审核通过后再把待办表同步到飞书，避免报告看完没人接。</p>
        </div>
      </section>
    </AppShell>
  );
}
