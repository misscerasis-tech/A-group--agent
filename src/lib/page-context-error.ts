export function normalizeWorkspaceContextError(error: unknown) {
  const message = error instanceof Error ? error.message : "无法加载当前 Workspace。";

  if (
    message.includes("DATABASE_URL") ||
    message.includes("prisma.") ||
    message.includes("Prisma")
  ) {
    return "本地数据库还没配置或未启动。A 组运营 Agent 首页可以直接使用；只有编辑项目/商品详情时才需要 PostgreSQL、迁移和 seed。";
  }

  return message;
}
