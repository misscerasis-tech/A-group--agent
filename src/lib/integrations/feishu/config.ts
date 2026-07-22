export type FeishuRuntimeConfig = {
  appId: string;
  appSecret: string;
  defaultChatId?: string;
};

export type FeishuEnvStatus = {
  configured: boolean;
  missing: string[];
  config?: FeishuRuntimeConfig;
};

const requiredKeys = ["FEISHU_APP_ID", "FEISHU_APP_SECRET"] as const;
const placeholderFragments = ["replace-with", "your-", "your_", "changeme", "todo", "只放本机", "不要提交"];

function isPlaceholderEnvValue(value: string) {
  const normalized = value.trim().toLowerCase();

  return placeholderFragments.some((fragment) => normalized.includes(fragment.toLowerCase()));
}

function readOptionalEnv(env: NodeJS.ProcessEnv, key: string) {
  const value = env[key]?.trim();
  return value && !isPlaceholderEnvValue(value) ? value : undefined;
}

export function getFeishuEnvStatus(env: NodeJS.ProcessEnv = process.env): FeishuEnvStatus {
  const missing = requiredKeys.filter((key) => !readOptionalEnv(env, key));

  if (missing.length > 0) {
    return {
      configured: false,
      missing,
    };
  }

  return {
    configured: true,
    missing: [],
    config: {
      appId: readOptionalEnv(env, "FEISHU_APP_ID")!,
      appSecret: readOptionalEnv(env, "FEISHU_APP_SECRET")!,
      defaultChatId: readOptionalEnv(env, "FEISHU_DEFAULT_CHAT_ID"),
    },
  };
}

export function requireFeishuRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): FeishuRuntimeConfig {
  const status = getFeishuEnvStatus(env);

  if (!status.config) {
    throw new Error(
      `飞书本地 worker 缺少环境变量：${status.missing.join("、")}。请只写入本机 .env，不要提交 Git。`,
    );
  }

  return status.config;
}
