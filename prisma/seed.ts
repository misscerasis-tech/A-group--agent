import { PrismaClient, ProductStatus, ProjectStatus, WorkspaceRole } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@example.com" },
    update: {
      name: "演示用户",
    },
    create: {
      name: "演示用户",
      email: "demo@example.com",
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { slug: "a-group-ecommerce-demo" },
    update: {
      name: "A 组电商运营 Demo",
      deletedAt: null,
    },
    create: {
      name: "A 组电商运营 Demo",
      slug: "a-group-ecommerce-demo",
    },
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: user.id,
      },
    },
    update: {
      role: WorkspaceRole.OWNER,
    },
    create: {
      workspaceId: workspace.id,
      userId: user.id,
      role: WorkspaceRole.OWNER,
    },
  });

  const product = await prisma.product.upsert({
    where: { id: "demo-product-aurora-cup" },
    update: {
      workspaceId: workspace.id,
      name: "Aurora Cup 智能温控旅行杯",
      description: "面向美国通勤和礼品场景的智能温控/温显旅行杯，强调温度可控、防漏、礼品属性和通勤体验。",
      status: ProductStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: "demo-product-aurora-cup",
      workspaceId: workspace.id,
      name: "Aurora Cup 智能温控旅行杯",
      description: "面向美国通勤和礼品场景的智能温控/温显旅行杯，强调温度可控、防漏、礼品属性和通勤体验。",
      status: ProductStatus.ACTIVE,
    },
  });

  const project = await prisma.project.upsert({
    where: { id: "demo-project-weekly-ops-review" },
    update: {
      workspaceId: workspace.id,
      name: "Aurora Cup 本周经营复盘",
      description: "围绕销量、利润、广告回本、库存风险和竞品压力的电商运营复盘项目。",
      status: ProjectStatus.ACTIVE,
      deletedAt: null,
    },
    create: {
      id: "demo-project-weekly-ops-review",
      workspaceId: workspace.id,
      name: "Aurora Cup 本周经营复盘",
      description: "围绕销量、利润、广告回本、库存风险和竞品压力的电商运营复盘项目。",
      status: ProjectStatus.ACTIVE,
    },
  });

  await prisma.projectProduct.upsert({
    where: {
      projectId_productId: {
        projectId: project.id,
        productId: product.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      productId: product.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
