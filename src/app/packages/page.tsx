import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoWorkspaceContext } from "@/lib/demo-context";
import { analyzeEcommerceStore } from "@/lib/ecommerce-agent/analysis";
import { buildOperationalWorkspace } from "@/lib/ecommerce-agent/operational-workspace";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

export default function PackagesPage() {
  const analysis = analyzeEcommerceStore(sampleEcommerceAgentInput);
  const workspace = buildOperationalWorkspace(sampleEcommerceAgentInput, analysis);

  return (
    <AppShell activePath="/packages" context={demoWorkspaceContext} returnTo="/packages">
      <section className="page-header">
        <div>
          <h2>周报包</h2>
          <p className="muted">
            这里不是单纯展示报告，而是把能回写飞书的消息、文档和表格产物都准备好。
          </p>
        </div>
        <Link className="button" href="/integrations">
          查看飞书接入
        </Link>
      </section>

      <section className="grid four">
        {workspace.packageArtifacts.map((artifact) => (
          <article className="panel stat" key={artifact.title}>
            <span className="muted">{artifact.destination}</span>
            <strong>{artifact.title}</strong>
            <StatusBadge
              label={artifact.status === "ready" ? "已生成" : "等补数据"}
              tone={artifact.status === "ready" ? "success" : "warning"}
            />
          </article>
        ))}
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>产物说明</h3>
          <div className="card-list">
            {workspace.packageArtifacts.map((artifact) => (
              <article className="item-card" key={`${artifact.title}-summary`}>
                <header>
                  <h4>{artifact.title}</h4>
                  <StatusBadge label={artifact.destination} />
                </header>
                <p>{artifact.summary}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="panel feishu-preview">
          <h3>飞书消息预览</h3>
          <pre>{analysis.feishuReply}</pre>
          <div className="health-row">
            <span>周报 Markdown 已生成 {workspace.weeklyMarkdown.length.toLocaleString("zh-CN")} 个字符。</span>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
