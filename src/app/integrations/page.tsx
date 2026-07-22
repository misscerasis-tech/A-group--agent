import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoWorkspaceContext } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

const testStages = [
  {
    title: "阶段 1：用样例数据测 Agent 脑子",
    status: "当前可测",
    description:
      "先确认 Agent 能不能问对问题、看懂数据、解释原因、生成行动清单。这一步不需要飞书和数据库。",
    checks: ["打开 /agent", "核对经营结论是否像人话", "检查商品问题诊断和下周行动清单"],
  },
  {
    title: "阶段 2：用真实表格替换样例数据",
    status: "下一步",
    description:
      "把 Shopify、淘宝、京东、Amazon 或广告平台导出的 CSV/Excel 接进来，验证字段识别和缺失追问。",
    checks: ["上传订单表", "上传库存表", "上传广告表", "检查缺字段时 Agent 是否追问"],
  },
  {
    title: "阶段 3：接飞书机器人",
    status: "比赛必做",
    description:
      "飞书负责触发任务和接收结果。真实比赛演示必须看到飞书发起、Agent 处理、结果回写。",
    checks: ["飞书群里发起复盘", "Agent 返回追问", "生成周报", "回写飞书文档或群消息"],
  },
  {
    title: "阶段 4：接一个外部平台",
    status: "比赛必做",
    description:
      "至少接一个电商、广告、数据追踪或竞品平台。没有平台授权时，先用公开竞品页和上传表格降级。",
    checks: ["读取 Shopify 或平台导出数据", "读取 GA/广告数据", "抓取或整理竞品商品页信号"],
  },
];

const feishuFields = [
  "App ID",
  "App Secret",
  "Encrypt Key",
  "Verification Token",
  "默认群 chat ID",
  "结果文档 document ID 或多维表格 bitable ID",
];

export default function IntegrationsPage() {
  return (
    <AppShell activePath="/integrations" context={demoWorkspaceContext} returnTo="/integrations">
      <section className="page-header">
        <div>
          <h2>平台接入与真实测试</h2>
          <p className="muted">
            先测 Agent 判断质量，再接真实数据，最后接飞书跑端到端演示。飞书要接，但不要一开始就把所有风险压到飞书上。
          </p>
        </div>
      </section>

      <section className="grid two">
        {testStages.map((stage) => (
          <article className="panel" key={stage.title}>
            <div className="section-heading compact-heading">
              <div>
                <h3>{stage.title}</h3>
                <p className="muted">{stage.description}</p>
              </div>
              <StatusBadge
                label={stage.status}
                tone={stage.status === "当前可测" ? "success" : "neutral"}
              />
            </div>
            <ol className="placeholder-steps">
              {stage.checks.map((check) => (
                <li key={check}>{check}</li>
              ))}
            </ol>
          </article>
        ))}
      </section>

      <section className="grid two" style={{ marginTop: 16 }}>
        <div className="panel">
          <h3>创建飞书应用后先保存这些信息</h3>
          <div className="card-list">
            {feishuFields.map((field) => (
              <article className="item-card" key={field}>
                <header>
                  <h4>{field}</h4>
                  <StatusBadge label="不要提交 Git" tone="warning" />
                </header>
              </article>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>飞书机器人迁移能力怎么测</h3>
          <ol className="placeholder-steps">
            <li>先配置旧机器人和新机器人两组连接。</li>
            <li>测试新机器人能否发消息到新群。</li>
            <li>生成迁移计划，确认有 checklist 和 rollback。</li>
            <li>切换 active 连接后，旧连接保留回滚入口。</li>
            <li>新连接失败时，把旧连接重新标为 active。</li>
          </ol>
        </div>
      </section>
    </AppShell>
  );
}
