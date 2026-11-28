import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("greenhouse-tick")!;

export const metadata = workPageMetadata(item);

export default function GreenhouseTickPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/greenhouse-tick/index.html"}
    />
  );
}