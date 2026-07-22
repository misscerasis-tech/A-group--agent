import { PlaceholderPage } from "@/components/placeholder-page";

export const dynamic = "force-dynamic";

export default function PackagesPage() {
  return (
    <PlaceholderPage
      activePath="/packages"
      description="后续会生成经营周报、风险清单、竞品观察表和待办导出，并保存在独立系统。"
      nextSteps={["定义周报包结构", "生成可下载文件", "接入飞书文档和待办状态"]}
      title="周报包"
    />
  );
}
