# A 组演示假设与真实竞品

用户目前还没有真实店铺和数据，所以第一阶段使用可替换的演示店铺。所有假设都必须明确标注，后续拿到真实数据后直接替换。

## 假设店铺

| 项目 | 内容 |
| --- | --- |
| 店铺名 | Aurora Cup 独立站 |
| 平台 | Shopify |
| 市场 | 美国 |
| 类目 | 智能温控/温显旅行杯 |
| 用户水平 | 电商新手 |
| 本次目标 | 同时看销量、利润、广告回本、库存风险、退款/退货和竞品压力 |

## 假设商品

- Aurora Cup 黑色 500ml
- Aurora Cup 白色 500ml
- Aurora Cup 礼盒套装

## 样例数据原则

- 数据用于演示 Agent 工作流，不代表真实经营结果。
- 数据结构尽量贴近 Shopify/广告平台/库存表/售后表可导出的字段。
- 用户声音样例来自客服售后备注和商品评价，用来解释退款/退货背后的具体原因。
- Agent 必须能解释数据完整度，不能因为缺数据就硬编结论。
- 后续真实数据到位后，优先替换 `src/lib/ecommerce-agent/sample-data.ts`，再增加上传解析。

## 真实演示竞品

以下竞品用于现场演示“Agent 自动观察外部平台”的业务逻辑。价格会随平台变化，代码里的价格只作为观察快照和价格带演示，不作为实时价格承诺。调价、跟促销或写正式周报前，必须重新打开原链接复核。

| 竞品 | 来源 | 观察日期 | 演示价格口径 | 演示用途 |
| --- | --- | --- | --- | --- |
| Ember Travel Mug 2 | https://ember.com/products/ember-travel-mug-2 | 2026-07-23 | 页面价快照，实际价格以页面为准 | 高端温控旅行杯，展示高价位竞品的精确温控、续航、App 和旅行场景卖点。 |
| Nextmug Self-Heating Mug | https://nextmug.com/products/nextmug-temperature-controlled-self-heating-coffee-mug-14-oz | 2026-07-23 | 官网 14 oz Nextmug sale price，实际价格以页面为准 | 中高价位易用型温控杯，展示三档控温、不用 App、LED 状态灯和充电杯垫卖点。 |
| VSITOO S3 Pro | https://www.vsitoo.com/collections/smart-mug/products/s3-pro | 2026-07-23 | 官网 S3 Pro from sale price，实际价格以页面为准 | App/AI 型温控杯，展示 AI 饮品检测、120-150°F 控温、App 和按键控制卖点。 |
| Locckmy LED Temperature Water Bottle | https://www.amazon.com/Locckmy-Temperature-Insulated-Stainless-AutomotiveTravel/dp/B085XHQ17Z | 2026-07-23 | 低价替代演示价；Amazon 页面当前可能没有 featured offer | 低价 LED 温显保温杯，展示低价替代品和价格压力；只用于价格带逻辑。 |

## 演示时怎么解释

可以这样说：

> 由于我们还没有真实店铺数据，第一版用一个 Shopify 智能杯独立站做演示。竞品不是虚构的，而是来自公开商品页。Agent 当前读取的是已整理过的演示信号，后续可以替换成实时抓取或平台 API。

## 后续替换真实数据的顺序

1. 替换店铺背景。
2. 替换订单和销售数据。
3. 替换库存数据。
4. 替换广告数据。
5. 替换退款/退货数据。
6. 替换竞品链接。
7. 保留样例数据作为现场失败降级。
