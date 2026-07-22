export type EcommerceTableTemplateId =
  | "weeklyMetrics"
  | "competitors"
  | "ads"
  | "inventoryCost"
  | "customerVoices";

export type EcommerceTableTemplate = {
  id: EcommerceTableTemplateId;
  title: string;
  description: string;
  csv: string;
};

export const ecommerceTableTemplates: EcommerceTableTemplate[] = [
  {
    id: "weeklyMetrics",
    title: "经营数据表",
    description: "最近两期经营复盘的主表，最少需要周期、商品/SKU、订单数、销售额和销量。",
    csv: [
      "week,product_name,sku,orders,revenue,units_sold,visitors,ad_spend,ad_revenue,inventory,product_cost,platform_fee,payment_fee,fulfillment_cost,gross_profit,refund_orders,refund_amount,refund_reason",
      "previous,黑杯,CUP-BLACK,10,500,12,120,80,240,50,300,50,5,15,130,1,30,杯盖漏水",
      "current,黑杯,CUP-BLACK,8,420,9,100,90,180,40,310,42,6,18,44,2,80,杯盖漏水 / 物流慢",
    ].join("\n"),
  },
  {
    id: "competitors",
    title: "竞品数据表",
    description: "补充竞品价格、促销、评分、评论数和卖点，用于解释外部价格与卖点压力。",
    csv: [
      "name,url,source,observed_at,price,price_note,promotion,rating,reviews,key_selling_points",
      "竞品 A,https://example.com/competitor-a,手动记录,2026-07-19,39.9,页面价快照，调价前需复核,满减,4.6,1200,低价 / 大容量",
      "竞品 B,https://example.com/competitor-b,手动记录,2026-07-19,59.9,页面价快照，调价前需复核,赠品,4.8,860,质感好 / 送礼",
    ].join("\n"),
  },
  {
    id: "ads",
    title: "广告数据表",
    description: "补充广告花费、成交额、ROAS 或 ACOS，用于判断投放是否回本。",
    csv: [
      "week,product_name,sku,campaign_name,ad_spend,acos",
      "previous,黑杯,CUP-BLACK,品牌词,80,25%",
      "current,黑杯,CUP-BLACK,品牌词,90,50%",
    ].join("\n"),
  },
  {
    id: "inventoryCost",
    title: "库存/成本快照表",
    description: "补充当前库存、单位成本或毛利率，用于判断断货风险和利润口径。",
    csv: [
      "product_name,sku,inventory,unit_cost,gross_margin_rate,observed_at",
      "黑杯,CUP-BLACK,40,22,0.35,2026-07-19",
      "白杯,CUP-WHITE,80,18,0.42,2026-07-19",
    ].join("\n"),
  },
  {
    id: "customerVoices",
    title: "用户声音/售后评价表",
    description: "补充客服备注、评价、退款备注或售后问题，用于解释用户为什么不满意。",
    csv: [
      "product_name,sku,source,observed_at,sentiment,theme,text,count",
      "黑杯,CUP-BLACK,客服备注,2026-07-19,negative,杯盖漏水,用户反馈杯盖渗水并要求退款,4",
      "黑杯,CUP-BLACK,商品评价,2026-07-19,negative,物流慢,用户说到货比承诺时间晚两天,3",
    ].join("\n"),
  },
];

export function getEcommerceTableTemplate(id: EcommerceTableTemplateId) {
  return ecommerceTableTemplates.find((template) => template.id === id);
}
