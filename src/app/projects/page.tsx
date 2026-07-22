import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoProducts, demoProject, demoWorkspaceContext } from "@/lib/demo-context";

export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return (
    <AppShell activePath="/projects" context={demoWorkspaceContext} returnTo="/projects">
      <section className="page-header">
        <div>
          <h2>店铺项目</h2>
          <p className="muted">
            Demo 阶段先固定一个店铺复盘项目。真实接入后，这里会保存每周复盘、风险提醒和行动清单。
          </p>
        </div>
        <Link className="button" href="/agent">
          开始本周复盘
        </Link>
      </section>

      <section className="grid two">
        <div className="panel">
          <h3>当前项目</h3>
          <article className="item-card">
            <header>
              <h4>{demoProject.name}</h4>
              <StatusBadge label="进行中" tone="success" />
            </header>
            <p>{demoProject.description}</p>
            <p>本项目覆盖销量、利润、广告回本、库存风险、退款/退货和竞品压力。</p>
          </article>
        </div>

        <div className="panel">
          <h3>项目需要的数据</h3>
          <div className="card-list">
            {["销售/订单数据", "流量或访客数据", "广告花费和广告成交额", "SKU 当前库存", "1-3 个竞品链接"].map(
              (item) => (
                <article className="item-card" key={item}>
                  <header>
                    <h4>{item}</h4>
                    <StatusBadge label="样例已准备" tone="success" />
                  </header>
                </article>
              ),
            )}
          </div>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>关联商品</h3>
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
      </section>
    </AppShell>
  );
}
