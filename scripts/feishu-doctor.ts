import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { getFeishuEnvStatus } from "../src/lib/integrations/feishu/config";

function loadLocalEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
      continue;
    }

    const [key, ...valueParts] = trimmed.split("=");
    const rawValue = valueParts.join("=").trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    process.env[key.trim()] ??= value;
  }
}

function readConfiguredCsv(pathValue: string | undefined) {
  if (!pathValue?.trim()) {
    return undefined;
  }

  const filePath = resolve(process.cwd(), pathValue.trim());

  if (!existsSync(filePath)) {
    throw new Error(`找不到数据文件：${filePath}`);
  }

  return {
    filePath,
    content: readFileSync(filePath, "utf8"),
  };
}

function main() {
  loadLocalEnvFile(".env");
  loadLocalEnvFile(".env.local");

  const envStatus = getFeishuEnvStatus();

  if (!envStatus.config) {
    console.error(`[feishu:doctor] 缺少环境变量：${envStatus.missing.join("、")}`);
    console.error("[feishu:doctor] 请把 App ID 和 App Secret 放在本机 .env，不要提交 Git。");
    process.exitCode = 1;
    return;
  }

  console.info(`[feishu:doctor] 已读取 App ID：${envStatus.config.appId}`);
  console.info("[feishu:doctor] App Secret 已配置，但不会打印。");

  const metricsCsv = readConfiguredCsv(process.env.ECOMMERCE_WEEKLY_METRICS_CSV);
  const competitorsCsv = readConfiguredCsv(process.env.ECOMMERCE_COMPETITORS_CSV);

  if (!metricsCsv) {
    console.info("[feishu:doctor] 未配置 ECOMMERCE_WEEKLY_METRICS_CSV，worker 会使用样例店铺回复。");
    console.info("[feishu:doctor] 配置真实 CSV 后，worker 会按真实数据回复。");
    return;
  }

  const importResult = buildEcommerceInputFromCsv({
    metricsCsv: metricsCsv.content,
    competitorsCsv: competitorsCsv?.content,
    store: {
      storeName: process.env.ECOMMERCE_STORE_NAME,
      platform: process.env.ECOMMERCE_PLATFORM,
      market: process.env.ECOMMERCE_MARKET,
      category: process.env.ECOMMERCE_CATEGORY,
      goal: process.env.ECOMMERCE_GOAL,
    },
  });

  if (!importResult.input) {
    console.error(`[feishu:doctor] 本地经营数据还不能分析：${metricsCsv.filePath}`);

    for (const issue of importResult.report.issues) {
      console.error(
        `- ${issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}${issue.message}`,
      );
    }

    process.exitCode = 1;
    return;
  }

  console.info(
    `[feishu:doctor] 本地经营数据可用：${importResult.input.store.storeName}，经营行 ${importResult.report.metricsRows} 行，竞品行 ${importResult.report.competitorRows} 行。`,
  );
  console.info("[feishu:doctor] 下一步可以运行：npx pnpm@10.13.1 run feishu:worker");
}

main();
