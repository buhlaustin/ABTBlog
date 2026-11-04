import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("eer")!;

export const metadata = workPageMetadata(item);

export default function EerPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/eer/index.html"}
    />
  );
}
