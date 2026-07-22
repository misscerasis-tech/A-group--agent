import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { FeishuEcommerceImportContext } from "./agent-reply";

export type FeishuChatContextStore = {
  get: (chatId: string) => FeishuEcommerceImportContext | undefined;
  set: (chatId: string, context: FeishuEcommerceImportContext) => void;
  size: () => number;
};

type PersistedChatContextRecord = {
  updatedAt: string;
  context: FeishuEcommerceImportContext;
};

type PersistedChatContextFile = {
  version: 1;
  updatedAt: string;
  contexts: Record<string, PersistedChatContextRecord>;
};

type FeishuChatContextStoreOptions = {
  maxContexts?: number;
  now?: () => Date;
  onWarning?: (message: string) => void;
};

function normalizeMaxContexts(value: number | undefined) {
  return Math.max(Math.floor(value ?? 50), 1);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPersistedChatContextRecord(value: unknown): value is PersistedChatContextRecord {
  return (
    isRecord(value) &&
    typeof value.updatedAt === "string" &&
    isRecord(value.context) &&
    isRecord(value.context.report) &&
    typeof value.context.sourceLabel === "string"
  );
}

function pruneOldestContexts(records: Map<string, PersistedChatContextRecord>, maxContexts: number) {
  while (records.size > maxContexts) {
    const oldestChatId = [...records.entries()].sort(
      (a, b) => Date.parse(a[1].updatedAt) - Date.parse(b[1].updatedAt),
    )[0]?.[0];

    if (!oldestChatId) {
      return;
    }

    records.delete(oldestChatId);
  }
}

export function createInMemoryFeishuChatContextStore(
  initialContexts: Iterable<[string, FeishuEcommerceImportContext]> = [],
): FeishuChatContextStore {
  const contexts = new Map(initialContexts);

  return {
    get: (chatId) => contexts.get(chatId),
    set: (chatId, context) => {
      contexts.set(chatId, context);
    },
    size: () => contexts.size,
  };
}

export function createFileFeishuChatContextStore(
  filePath: string,
  options: FeishuChatContextStoreOptions = {},
): FeishuChatContextStore {
  const maxContexts = normalizeMaxContexts(options.maxContexts);
  const now = options.now ?? (() => new Date());
  const warn = options.onWarning ?? (() => undefined);
  const contexts = new Map<string, PersistedChatContextRecord>();

  if (existsSync(filePath)) {
    try {
      const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<PersistedChatContextFile>;

      for (const [chatId, record] of Object.entries(parsed.contexts ?? {})) {
        if (isPersistedChatContextRecord(record)) {
          contexts.set(chatId, record);
        }
      }

      pruneOldestContexts(contexts, maxContexts);
    } catch (error) {
      warn(`无法读取飞书会话上下文缓存，将从空缓存启动：${error instanceof Error ? error.message : error}`);
    }
  }

  function flush() {
    try {
      mkdirSync(dirname(filePath), { recursive: true });
      const payload: PersistedChatContextFile = {
        version: 1,
        updatedAt: now().toISOString(),
        contexts: Object.fromEntries(contexts.entries()),
      };

      writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    } catch (error) {
      warn(`无法保存飞书会话上下文缓存：${error instanceof Error ? error.message : error}`);
    }
  }

  return {
    get: (chatId) => contexts.get(chatId)?.context,
    set: (chatId, context) => {
      contexts.set(chatId, {
        updatedAt: now().toISOString(),
        context,
      });
      pruneOldestContexts(contexts, maxContexts);
      flush();
    },
    size: () => contexts.size,
  };
}

export function resolveFeishuChatContextFile(
  env: NodeJS.ProcessEnv = process.env,
  cwd = process.cwd(),
) {
  const persistenceMode = env.FEISHU_CHAT_CONTEXT_PERSISTENCE?.trim().toLowerCase();

  if (["0", "false", "no", "off", "disabled"].includes(persistenceMode ?? "")) {
    return null;
  }

  return resolve(cwd, env.FEISHU_CHAT_CONTEXT_FILE?.trim() || ".agent-state/feishu-chat-contexts.json");
}
