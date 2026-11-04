import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("hos")!;

export const metadata = workPageMetadata(item);

export default function HosPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/hos/index.html"}
    />
  );
}
