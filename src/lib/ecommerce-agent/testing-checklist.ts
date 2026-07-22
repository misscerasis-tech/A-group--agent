export type TestingStage = {
  title: string;
  status: string;
  reason: string;
  checks: string[];
  tryMessages?: string[];
  passCriteria?: string[];
};

export const ecommerceAgentTestingStages: TestingStage[] = [
  {
    title: "阶段 1：先测 Agent 脑子",
    status: "现在就能测",
    reason: "先确认它会不会问问题、看数据、讲人话，不把飞书权限问题和业务判断问题混在一起。",
    checks: ["打开 /agent", "粘贴样例或真实经营表", "检查字段缺失时是否继续追问"],
    tryMessages: ["我现在做什么", "我需要准备什么数据", "帮我看本周经营情况"],
    passCriteria: ["能给可复制的最小经营表", "能解释销售、订单、售后和库存，不只报数字"],
  },
  {
    title: "阶段 2：再测真实表格",
    status: "现在就能测",
    reason: "真实可用的核心是能接店铺导出数据，而不是只跑演示模板。",
    checks: ["准备 previous/current 两段经营数据", "上传或粘贴到真实数据导入工作台", "检查 workSession 下一句追问"],
    tryMessages: [
      [
        "week,product_name,sku,orders,revenue,units_sold",
        "previous,黑杯,CUP-BLACK,10,500,12",
        "current,黑杯,CUP-BLACK,8,420,9",
      ].join("\n"),
      "给我待办清单",
      "给我风险商品表",
    ],
    passCriteria: ["字段缺失时不硬编", "待办表有状态、负责人和验收标准", "风险商品表有排查状态和建议负责人"],
  },
  {
    title: "阶段 3：再接飞书长连接",
    status: "需要 App Secret",
    reason: "飞书是任务入口和协同出口；本地长连接不需要公网 HTTPS，适合先测闭环。",
    checks: ["在 .env 填 FEISHU_APP_ID 和 FEISHU_APP_SECRET", "运行 pnpm run feishu:worker", "给机器人发“帮我看本周经营情况”"],
    tryMessages: ["我现在做什么", "帮我看本周经营情况", "我还缺什么数据", "清空这份数据"],
    passCriteria: ["worker 控制台能看到收到消息", "机器人能回到同一会话", "清空后不再沿用刚才粘贴的数据"],
  },
  {
    title: "阶段 4：最后接外部平台",
    status: "后续增强",
    reason: "比赛需要至少一个外部平台。没有正式授权时，表格上传和公开竞品页是稳定降级。",
    checks: ["优先 Shopify 或平台导出表", "其次广告/GA 数据", "保留样例数据作为现场回滚"],
    tryMessages: ["这是竞品链接：https://example.com/item", "竞品怎么看"],
    passCriteria: ["机器人不假装实时读取链接价格", "会要求补竞品名称、价格、观察日期、价格备注和卖点"],
  },
];

function optionalLines(title: string, values?: string[]) {
  if (!values || values.length === 0) {
    return [];
  }

  return [`${title}：${values.join("；")}`];
}

export function buildTestingChecklistReply() {
  return [
    "要真正测试，顺序不是先死磕飞书，而是这样：",
    "",
    ...ecommerceAgentTestingStages.map(
      (stage, index) =>
        [
          `${index + 1}. ${stage.title}（${stage.status}）`,
          `为什么：${stage.reason}`,
          `检查：${stage.checks.join("；")}`,
          ...optionalLines("可直接发的测试消息", stage.tryMessages),
          ...optionalLines("通过标准", stage.passCriteria),
        ].join("\n"),
    ),
    "",
    "你回来后如果只想先做最短验收：打开 /agent 跑一遍样例，再填 App Secret 启动 worker，在飞书依次发“我现在做什么”“帮我看本周经营情况”“给我待办清单”。",
    "",
    "结论：飞书要接，但它是端到端入口；在你回来填 App Secret 前，我可以先把本地网页、API、CSV/TSV/Markdown 识别、追问和周报输出磨稳。",
  ].join("\n");
}
