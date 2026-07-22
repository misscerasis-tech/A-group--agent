import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { buildFeishuImportContextFromText } from "./agent-reply";
import {
  createFileFeishuChatContextStore,
  resolveFeishuChatContextFile,
} from "./chat-context-store";

describe("feishu chat context store", () => {
  const tempDirs: string[] = [];

  afterEach(() => {
    for (const tempDir of tempDirs.splice(0)) {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  function createTempDir() {
    const tempDir = mkdtempSync(join(tmpdir(), "feishu-chat-context-"));
    tempDirs.push(tempDir);
    return tempDir;
  }

  function createImportContext() {
    const context = buildFeishuImportContextFromText(
      [
        "week\tproduct_name\torders\trevenue\tunits_sold",
        "previous\t黑杯\t10\t500\t12",
        "current\t黑杯\t8\t420\t9",
      ].join("\n"),
    );

    if (!context) {
      throw new Error("测试表格应该生成飞书导入上下文。");
    }

    return context;
  }

  it("persists pasted table context across worker restarts", () => {
    const filePath = join(createTempDir(), "state", "contexts.json");
    const firstStore = createFileFeishuChatContextStore(filePath, {
      now: () => new Date("2026-07-23T00:00:00.000Z"),
    });

    firstStore.set("oc_123", createImportContext());

    const secondStore = createFileFeishuChatContextStore(filePath);
    const restoredContext = secondStore.get("oc_123");

    expect(restoredContext?.sourceLabel).toBe("刚粘贴的表格");
    expect(restoredContext?.input?.store.storeName).toBe("飞书粘贴数据店铺");
    expect(restoredContext?.report.ok).toBe(true);
  });

  it("keeps only the latest bounded number of chat contexts", () => {
    const filePath = join(createTempDir(), "contexts.json");
    const dates = [
      new Date("2026-07-23T00:00:00.000Z"),
      new Date("2026-07-23T00:01:00.000Z"),
      new Date("2026-07-23T00:02:00.000Z"),
    ];
    const store = createFileFeishuChatContextStore(filePath, {
      maxContexts: 2,
      now: () => dates.shift() ?? new Date("2026-07-23T00:03:00.000Z"),
    });

    store.set("oc_old", createImportContext());
    store.set("oc_mid", createImportContext());
    store.set("oc_new", createImportContext());

    const restoredStore = createFileFeishuChatContextStore(filePath, { maxContexts: 2 });

    expect(restoredStore.get("oc_old")).toBeUndefined();
    expect(restoredStore.get("oc_mid")).toBeDefined();
    expect(restoredStore.get("oc_new")).toBeDefined();
  });

  it("deletes a chat context from the persisted file", () => {
    const filePath = join(createTempDir(), "contexts.json");
    const store = createFileFeishuChatContextStore(filePath);

    store.set("oc_123", createImportContext());
    expect(store.delete("oc_123")).toBe(true);

    const restoredStore = createFileFeishuChatContextStore(filePath);

    expect(restoredStore.get("oc_123")).toBeUndefined();
  });

  it("can disable file persistence from env", () => {
    const filePath = resolveFeishuChatContextFile(
      {
        NODE_ENV: "test",
        FEISHU_CHAT_CONTEXT_PERSISTENCE: "off",
      },
      createTempDir(),
    );

    expect(filePath).toBeNull();
  });
});
