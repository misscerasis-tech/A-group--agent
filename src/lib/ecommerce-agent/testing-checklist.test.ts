import { describe, expect, it } from "vitest";
import { buildTestingChecklistReply, ecommerceAgentTestingStages } from "./testing-checklist";

describe("ecommerce testing checklist", () => {
  it("keeps Feishu testing after local agent validation", () => {
    expect(ecommerceAgentTestingStages[0].title).toContain("Agent 脑子");
    expect(ecommerceAgentTestingStages[2].title).toContain("飞书");

    const reply = buildTestingChecklistReply();

    expect(reply).toContain("App Secret");
    expect(reply).toContain("飞书要接");
  });
});
