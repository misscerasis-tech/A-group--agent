import { PlaceholderPage } from "@/components/placeholder-page";

export const dynamic = "force-dynamic";

export default function RemindersPage() {
  return (
    <PlaceholderPage
      activePath="/reminders"
      description="后续会基于库存、广告回本、销售异常、竞品价格和待办状态主动生成提醒。"
      nextSteps={["定义风险规则", "加入后台任务", "支持飞书通知配置"]}
      title="提醒中心"
    />
  );
}
