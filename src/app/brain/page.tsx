import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { StatusBadge } from "@/components/ui/status-badge";
import { demoProducts, demoWorkspaceContext } from "@/lib/demo-context";
import { sampleEcommerceAgentInput } from "@/lib/ecommerce-agent/sample-data";

export const dynamic = "force-dynamic";

export default function ProductBrainPage() {
  return (
    <AppShell activePath="/brain" context={demoWorkspaceContext} returnTo="/brain">
      <section className="page-header">
        <div>
          <h2>商品档案</h2>
          <p className="muted">
            Agent 需要知道商品事实，才能把销售、广告、库存、售后和竞品变化解释成人能执行的动作。
          </p>
        </div>
        <Link className="button" href="/agent">
          用这些商品生成复盘
        </Link>
      </section>

      <section className="grid two">
        <div className="panel">
          <h3>演示店铺</h3>
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
              <dt>类目</dt>
              <dd>{sampleEcommerceAgentInput.store.category}</dd>
            </div>
          </dl>
        </div>

        <div className="panel">
          <h3>Agent 会用商品档案做什么</h3>
          <ol className="placeholder-steps">
            <li>判断哪个 SKU 是主推款、稳定款、增长款。</li>
            <li>把库存和销售速度结合，提前发现断货风险。</li>
            <li>把商品卖点和竞品卖点对比，判断购买理由是否够清楚。</li>
            <li>把建议变成飞书待办，而不是只给一段报告。</li>
          </ol>
        </div>
      </section>

      <section className="panel" style={{ marginTop: 16 }}>
        <h3>商品列表</h3>
        <div className="card-list">
          {demoProducts.map((product) => (
            <article className="item-card" key={product.id}>
              <header>
                <h4>{product.name}</h4>
                <StatusBadge label="启用" tone="success" />
              </header>
              <p>{product.description}</p>
              <p>已用于 {product.linkedProjects} 个复盘项目。</p>
            </article>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
