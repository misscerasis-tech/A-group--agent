import { PlaceholderPage } from "@/components/placeholder-page";

export const dynamic = "force-dynamic";

export default function CalendarPage() {
  return (
    <PlaceholderPage
      activePath="/calendar"
      description="后续会按周生成店铺复盘节奏、补货检查、广告检查和竞品观察计划。"
      nextSteps={["接入复盘结果", "生成运营排期", "支持按周或按月查看运营计划"]}
      title="运营计划"
    />
  );
}
