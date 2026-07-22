import { PlaceholderPage } from "@/components/placeholder-page";

export const dynamic = "force-dynamic";

export default function ReviewsPage() {
  return (
    <PlaceholderPage
      activePath="/reviews"
      description="后续会承接经营建议确认、广告调整审核、补货提醒确认和竞品风险复核。"
      nextSteps={["建立审核任务", "记录人工确认", "为飞书简单审核预留连接"]}
      title="审核中心"
    />
  );
}
