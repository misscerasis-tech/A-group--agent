export type TestingStage = {
  title: string;
  status: string;
  reason: string;
  checks: string[];
};

export const ecommerceAgentTestingStages: TestingStage[] = [
  {
    title: "阶段 1：先测 Agent 脑子",
    status: "现在就能测",
    reason: "先确认它会不会问问题、看数据、讲人话，不把飞书权限问题和业务判断问题混在一起。",
    checks: ["打开 /agent", "粘贴样例或真实 CSV", "检查字段缺失时是否继续追问"],
  },
  {
    title: "阶段 2：再测真实表格",
    status: "现在就能测",
    reason: "真实可用的核心是能接店铺导出数据，而不是只跑演示模板。",
    checks: ["准备 previous/current 两段经营数据", "上传或粘贴到真实数据导入工作台", "检查 workSession 下一句追问"],
  },
  {
    title: "阶段 3：再接飞书长连接",
    status: "需要 App Secret",
    reason: "飞书是任务入口和协同出口；本地长连接不需要公网 HTTPS，适合先测闭环。",
    checks: ["在 .env 填 FEISHU_APP_ID 和 FEISHU_APP_SECRET", "运行 pnpm run feishu:worker", "给机器人发“帮我看本周经营情况”"],
  },
  {
    title: "阶段 4：最后接外部平台",
    status: "后续增强",
    reason: "比赛需要至少一个外部平台。没有正式授权时，表格上传和公开竞品页是稳定降级。",
    checks: ["优先 Shopify 或平台导出表", "其次广告/GA 数据", "保留样例数据作为现场回滚"],
  },
];

export function buildTestingChecklistReply() {
  return [
    "要真正测试，顺序不是先死磕飞书，而是这样：",
    "",
    ...ecommerceAgentTestingStages.map(
      (stage, index) =>
        `${index + 1}. ${stage.title}（${stage.status}）\n为什么：${stage.reason}\n检查：${stage.checks.join("；")}`,
    ),
    "",
    "结论：飞书要接，但它是端到端入口；在你回来填 App Secret 前，我可以先把本地网页、API、CSV 识别、追问和周报输出磨稳。",
  ].join("\n");
}
