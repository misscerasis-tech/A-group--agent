import { describe, expect, it } from "vitest";
import { normalizeWorkspaceContextError } from "./page-context-error";

describe("page context error normalization", () => {
  it("turns Prisma setup errors into a beginner-friendly message", () => {
    const message = normalizeWorkspaceContextError(
      new Error("Invalid `prisma.user.findUnique()` invocation: Environment variable not found: DATABASE_URL"),
    );

    expect(message).toContain("本地数据库还没配置或未启动");
    expect(message).toContain("A 组运营 Agent 首页可以直接使用");
    expect(message).not.toContain("prisma.user.findUnique");
  });
});
