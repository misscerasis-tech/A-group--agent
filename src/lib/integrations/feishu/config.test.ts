import { describe, expect, it } from "vitest";
import { getFeishuEnvStatus, requireFeishuRuntimeConfig } from "./config";

function env(values: Record<string, string | undefined>) {
  return values as unknown as NodeJS.ProcessEnv;
}

describe("feishu runtime config", () => {
  it("reports missing required Feishu env keys", () => {
    const status = getFeishuEnvStatus(env({}));

    expect(status.configured).toBe(false);
    expect(status.missing).toEqual(["FEISHU_APP_ID", "FEISHU_APP_SECRET"]);
  });

  it("returns configured Feishu runtime values without requiring optional ids", () => {
    const config = requireFeishuRuntimeConfig(env({
      FEISHU_APP_ID: "cli_test",
      FEISHU_APP_SECRET: "secret_test",
    }));

    expect(config.appId).toBe("cli_test");
    expect(config.appSecret).toBe("secret_test");
  });
});
