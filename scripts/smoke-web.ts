const baseUrl = process.env.SMOKE_BASE_URL ?? "http://localhost:3001";

const routes = [
  "/agent",
  "/dashboard",
  "/projects",
  "/projects/test-id",
  "/brain",
  "/brain/products/test-id",
  "/calendar",
  "/reviews",
  "/packages",
  "/recaps",
  "/reminders",
  "/integrations",
];

const rawSetupErrorPatterns = [
  /Invalid `prisma\./,
  /DATABASE_URL/,
  /Environment variable not found/,
  /schema\.prisma/,
];

const requiredRouteText: Record<string, string[]> = {
  "/agent": [
    "真实数据导入工作台",
    "Shopify 订单样例",
    "Amazon 订单样例",
    "电商一定关注哪些数据",
    "已自动处理",
  ],
};

async function checkRoute(route: string) {
  const url = new URL(route, baseUrl);
  const response = await fetch(url);
  const text = await response.text();
  const leakedSetupError = rawSetupErrorPatterns.some((pattern) => pattern.test(text));
  const missingText = (requiredRouteText[route] ?? []).filter((requiredText) => !text.includes(requiredText));

  return {
    route,
    status: response.status,
    leakedSetupError,
    missingText,
  };
}

async function main() {
  const results = await Promise.all(routes.map(checkRoute));
  const failed = results.filter(
    (result) => result.status !== 200 || result.leakedSetupError || result.missingText.length > 0,
  );

  for (const result of results) {
    console.info(
      `[smoke:web] ${result.route} ${result.status}${result.leakedSetupError ? " raw-setup-error" : ""}${
        result.missingText.length > 0 ? ` missing=${result.missingText.join("/")}` : ""
      }`,
    );
  }

  if (failed.length > 0) {
    throw new Error(
      `页面健康检查失败：${failed
        .map(
          (result) =>
            `${result.route}=${result.status}${result.leakedSetupError ? "/raw-setup-error" : ""}${
              result.missingText.length > 0 ? `/missing:${result.missingText.join("/")}` : ""
            }`,
        )
        .join("，")}`,
    );
  }

  console.info(`[smoke:web] 页面路由和数据库友好错误检查均通过：${baseUrl}`);
}

main().catch((error) => {
  console.error(`[smoke:web] ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});

export {};
