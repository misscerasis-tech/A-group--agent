import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { getFeishuEnvStatus } from "../src/lib/integrations/feishu/config";

const knownAGroupFeishuAppId = "cli_aaea1dbb6ee1dd10";

function loadLocalEnvFile(fileName: string) {
  const envPath = resolve(process.cwd(), fileName);

  if (!existsSync(envPath)) {
    return false;
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

  return true;
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
  const loadedEnvFiles = [".env", ".env.local"].filter(loadLocalEnvFile);

  if (loadedEnvFiles.length === 0) {
    console.info("[feishu:doctor] 没有发现 .env 或 .env.local；可以先复制 .env.example 到 .env。");
  }

  const envStatus = getFeishuEnvStatus();
  let hasError = false;

  if (!envStatus.config) {
    console.error(`[feishu:doctor] 缺少环境变量：${envStatus.missing.join("、")}`);
    console.error("[feishu:doctor] 请把 App ID 和 App Secret 放在本机 .env，不要提交 Git。");
    if (envStatus.missing.includes("FEISHU_APP_ID")) {
      console.error(`[feishu:doctor] A 组当前 App ID 可填：${knownAGroupFeishuAppId}`);
    }
    if (envStatus.missing.includes("FEISHU_APP_SECRET")) {
      console.error("[feishu:doctor] App Secret 需要你在飞书开放平台“凭证与基础信息”里复制。");
    }
    hasError = true;
  } else {
    console.info(`[feishu:doctor] 已读取 App ID：${envStatus.config.appId}`);
    console.info("[feishu:doctor] App Secret 已配置，但不会打印。");
  }

  const subscriptionMode = process.env.FEISHU_EVENT_SUBSCRIPTION_MODE?.trim() || "long_connection";

  if (subscriptionMode === "long_connection") {
    console.info("[feishu:doctor] 事件订阅模式：long_connection，适合本地测试。");
  } else {
    console.info(`[feishu:doctor] 事件订阅模式：${subscriptionMode}，请确认本地测试是否有公网 HTTPS 回调。`);
  }

  let metricsCsv: ReturnType<typeof readConfiguredCsv>;
  let competitorsCsv: ReturnType<typeof readConfiguredCsv>;
  let customerVoicesCsv: ReturnType<typeof readConfiguredCsv>;
  let inventoryCsv: ReturnType<typeof readConfiguredCsv>;
  let adsCsv: ReturnType<typeof readConfiguredCsv>;

  try {
    metricsCsv = readConfiguredCsv(process.env.ECOMMERCE_WEEKLY_METRICS_CSV);
    competitorsCsv = readConfiguredCsv(process.env.ECOMMERCE_COMPETITORS_CSV);
    customerVoicesCsv = readConfiguredCsv(process.env.ECOMMERCE_CUSTOMER_VOICES_CSV);
    inventoryCsv = readConfiguredCsv(process.env.ECOMMERCE_INVENTORY_CSV);
    adsCsv = readConfiguredCsv(process.env.ECOMMERCE_ADS_CSV);
  } catch (error) {
    console.error(`[feishu:doctor] ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }

  if (!metricsCsv) {
    console.info("[feishu:doctor] 未配置 ECOMMERCE_WEEKLY_METRICS_CSV，worker 会使用样例店铺回复。");
    console.info("[feishu:doctor] 配置真实经营表后，worker 会按真实数据回复。");
    process.exitCode = hasError ? 1 : 0;
    return;
  }

  const importResult = buildEcommerceInputFromCsv({
    metricsCsv: metricsCsv.content,
    competitorsCsv: competitorsCsv?.content,
    customerVoicesCsv: customerVoicesCsv?.content,
    inventoryCsv: inventoryCsv?.content,
    adsCsv: adsCsv?.content,
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

  for (const issue of importResult.report.issues.filter((issue) => issue.severity === "warning").slice(0, 5)) {
    console.warn(`[feishu:doctor] 提醒：${issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}${issue.message}`);
  }

  console.info(
    `[feishu:doctor] 本地经营数据可用：${importResult.input.store.storeName}，经营行 ${importResult.report.metricsRows} 行，广告行 ${importResult.report.adRows} 行，竞品行 ${importResult.report.competitorRows} 行，用户声音行 ${importResult.report.customerVoiceRows} 行，库存/成本行 ${importResult.report.inventoryRows} 行。`,
  );

  if (hasError) {
    console.error("[feishu:doctor] 本地数据可用；补齐飞书环境变量后再运行 worker。");
    process.exitCode = 1;
    return;
  }

  console.info("[feishu:doctor] 下一步可以运行：npx pnpm@10.13.1 run feishu:worker");
}

main();
