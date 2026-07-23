import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeEcommerceStore } from "../src/lib/ecommerce-agent/analysis";
import { buildEcommerceInputFromCsv } from "../src/lib/ecommerce-agent/csv-import";
import { buildDataRequestPlan } from "../src/lib/ecommerce-agent/data-request";
import { buildBeginnerWorkSession } from "../src/lib/ecommerce-agent/work-session";
import { resolveFeishuChatContextFile } from "../src/lib/integrations/feishu/chat-context-store";
import { getFeishuEnvStatus } from "../src/lib/integrations/feishu/config";

type CsvBundle = {
  metricsCsv?: string;
  competitorsCsv?: string;
  adsCsv?: string;
  inventoryCsv?: string;
  customerVoicesCsv?: string;
};
type ImportableCsvBundle = CsvBundle & {
  metricsCsv: string;
};

const sampleBundlePaths: Required<Record<keyof CsvBundle, string>> = {
  metricsCsv: "data/samples/aurora-cup-weekly-metrics.csv",
  competitorsCsv: "data/samples/aurora-cup-competitors.csv",
  adsCsv: "data/samples/aurora-cup-ads.csv",
  inventoryCsv: "data/samples/aurora-cup-inventory.csv",
  customerVoicesCsv: "data/samples/aurora-cup-customer-voices.csv",
};
const knownAGroupFeishuAppId = "cli_aaea1dbb6ee1dd10";

const configuredCsvEnvKeys: Record<keyof CsvBundle, string> = {
  metricsCsv: "ECOMMERCE_WEEKLY_METRICS_CSV",
  competitorsCsv: "ECOMMERCE_COMPETITORS_CSV",
  adsCsv: "ECOMMERCE_ADS_CSV",
  inventoryCsv: "ECOMMERCE_INVENTORY_CSV",
  customerVoicesCsv: "ECOMMERCE_CUSTOMER_VOICES_CSV",
};

function log(message = "") {
  console.info(message ? `[agent:readiness] ${message}` : "");
}

function warn(message: string) {
  console.warn(`[agent:readiness] 提醒：${message}`);
}

function error(message: string) {
  console.error(`[agent:readiness] 错误：${message}`);
}

function runGit(command: string) {
  try {
    return execSync(command, {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return undefined;
  }
}

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

function readTextFile(relativeOrAbsolutePath: string) {
  const filePath = resolve(process.cwd(), relativeOrAbsolutePath);

  if (!existsSync(filePath)) {
    throw new Error(`找不到文件：${filePath}`);
  }

  return readFileSync(filePath, "utf8");
}

function readSampleBundle(): ImportableCsvBundle {
  return Object.fromEntries(
    Object.entries(sampleBundlePaths).map(([key, path]) => [key, readTextFile(path)]),
  ) as ImportableCsvBundle;
}

function readConfiguredBundle():
  | {
      paths: Partial<Record<keyof CsvBundle, string>>;
      bundle: undefined;
    }
  | {
      paths: Partial<Record<keyof CsvBundle, string>>;
      bundle: ImportableCsvBundle;
    } {
  const configuredPaths = Object.fromEntries(
    Object.entries(configuredCsvEnvKeys)
      .map(([key, envKey]) => [key, process.env[envKey]?.trim()])
      .filter((entry): entry is [string, string] => Boolean(entry[1])),
  ) as Partial<Record<keyof CsvBundle, string>>;

  if (!configuredPaths.metricsCsv) {
    return {
      paths: configuredPaths,
      bundle: undefined,
    };
  }

  return {
    paths: configuredPaths,
    bundle: Object.fromEntries(
      Object.entries(configuredPaths).map(([key, path]) => [key, readTextFile(path)]),
    ) as ImportableCsvBundle,
  };
}

function printGitStatus() {
  const tag = runGit("git describe --tags --abbrev=0");
  const commit = runGit("git rev-parse --short HEAD");
  const status = runGit("git status --porcelain");
  const branch = runGit("git rev-parse --abbrev-ref HEAD");

  log(`代码版本：${branch ?? "未知分支"} ${commit ?? "未知 commit"}${tag ? `，最新标签 ${tag}` : ""}`);
  log(status ? "工作区有未提交改动，提交前请先复查 git diff。" : "工作区干净，可从当前版本继续测试或回滚。");
}

function printImportReadiness(label: string, bundle: ImportableCsvBundle, isConfiguredData = false) {
  const importResult = buildEcommerceInputFromCsv({
    ...bundle,
    store: {
      storeName: process.env.ECOMMERCE_STORE_NAME || (isConfiguredData ? "本地配置店铺" : "Readiness Aurora Cup"),
      platform: process.env.ECOMMERCE_PLATFORM || "Shopify",
      market: process.env.ECOMMERCE_MARKET || "美国",
      category: process.env.ECOMMERCE_CATEGORY || "智能温控/温显旅行杯",
      goal: process.env.ECOMMERCE_GOAL || "同时看销量、利润、广告回本、库存风险、退款/退货和竞品压力",
    },
  });

  if (!importResult.input) {
    error(`${label}还不能分析。`);
    for (const issue of importResult.report.issues.slice(0, 6)) {
      error(`${issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const analysis = analyzeEcommerceStore(importResult.input);
  const dataRequestPlan = buildDataRequestPlan(importResult.report, analysis.questionsForUser);
  const workSession = buildBeginnerWorkSession(importResult.report, analysis.questionsForUser);

  log(
    `${label}可分析：经营行 ${importResult.report.metricsRows}，广告行 ${importResult.report.adRows}，库存/成本行 ${importResult.report.inventoryRows}，用户声音行 ${importResult.report.customerVoiceRows}，竞品行 ${importResult.report.competitorRows}。`,
  );
  log(`复盘结论预览：${analysis.headline}`);
  log(`Agent 下一句会问：${workSession.nextQuestion}`);
  log(`补数判断：${dataRequestPlan.summary}`);

  const firstTask = analysis.operationalTasks[0];

  if (firstTask) {
    log(`首个运营待办：${firstTask.owner}｜${firstTask.title}｜${firstTask.firstStep}`);
  }

  for (const issue of importResult.report.issues.filter((item) => item.severity === "warning").slice(0, 3)) {
    warn(`${label}${issue.rowNumber ? `第 ${issue.rowNumber} 行：` : ""}${issue.message}`);
  }
}

function printConfiguredDataStatus() {
  try {
    const configured = readConfiguredBundle();

    if (!configured.bundle) {
      log("本地真实经营表：还没有配置 ECOMMERCE_WEEKLY_METRICS_CSV，飞书 worker 会先用样例店铺或等待用户在飞书粘贴表格。");
      return;
    }

    log(
      `本地真实经营表路径：${Object.entries(configured.paths)
        .map(([key, path]) => `${configuredCsvEnvKeys[key as keyof CsvBundle]}=${path}`)
        .join("；")}`,
    );
    printImportReadiness("本地配置数据", configured.bundle, true);
  } catch (readError) {
    error(readError instanceof Error ? readError.message : `${readError}`);
    process.exitCode = 1;
  }
}

function printFeishuStatus(loadedEnvFiles: string[]) {
  if (loadedEnvFiles.length === 0) {
    log("环境文件：未发现 .env 或 .env.local。需要飞书真测时，先执行 cp .env.example .env。");
  } else {
    log(`环境文件：已读取 ${loadedEnvFiles.join("、")}。`);
  }

  const feishuStatus = getFeishuEnvStatus();
  const subscriptionMode = process.env.FEISHU_EVENT_SUBSCRIPTION_MODE?.trim() || "long_connection";
  const chatContextFile = resolveFeishuChatContextFile();

  if (feishuStatus.config) {
    log(`飞书配置：App ID ${feishuStatus.config.appId} 已读取，App Secret 已配置但不会打印。`);
  } else {
    log(`飞书配置：还缺 ${feishuStatus.missing.join("、")}。App Secret 需要你从飞书开放平台复制到本机 .env。`);
    if (feishuStatus.missing.includes("FEISHU_APP_ID")) {
      log(`A 组当前已知 App ID：${knownAGroupFeishuAppId}。`);
    }
  }

  log(`飞书事件模式：${subscriptionMode}。本地测试建议使用 long_connection。`);
  log(
    chatContextFile
      ? `飞书会话缓存：${chatContextFile}。同一 chat 粘贴的数据会被本机记住。`
      : "飞书会话缓存：已关闭；worker 重启后需要重新粘贴经营表。",
  );
  log("飞书开放平台入口：https://open.feishu.cn/app");
}

async function checkLocalWeb(baseUrl: string) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/agent`, {
      signal: controller.signal,
    });

    if (response.ok) {
      log(`本地页面：${baseUrl}/agent 可访问。`);
    } else {
      warn(`本地页面 ${baseUrl}/agent 返回 ${response.status}；启动后建议跑 smoke:web。`);
    }
  } catch {
    log(`本地页面：当前没连上 ${baseUrl}/agent。需要页面测试时运行 npx pnpm@10.13.1 exec next dev -p 3001。`);
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const loadedEnvFiles = [".env", ".env.local"].filter(loadLocalEnvFile);

  log("A 组电商运营 Agent 可用性体检");
  printGitStatus();
  log();

  printImportReadiness("样例数据", readSampleBundle());
  log();

  printConfiguredDataStatus();
  log();

  printFeishuStatus(loadedEnvFiles);
  log();

  await checkLocalWeb(process.env.SMOKE_BASE_URL?.trim() || "http://localhost:3001");
  log();

  log("你回来后的最短真测路径：");
  log("1. npx pnpm@10.13.1 run agent:readiness");
  log("2. SMOKE_BASE_URL=http://localhost:3001 npx pnpm@10.13.1 run smoke:web");
  log("3. SMOKE_BASE_URL=http://localhost:3001 npx pnpm@10.13.1 run smoke:api");
  log("4. 补 FEISHU_APP_SECRET 后运行 npx pnpm@10.13.1 run feishu:doctor");
  log("5. doctor 通过后运行 npx pnpm@10.13.1 run feishu:worker，并在飞书发“我现在做什么”。");
}

void main();
