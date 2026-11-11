import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("white-house-2028")!;

export const metadata = workPageMetadata(item);

export default function WhiteHouse2028PlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/white-house-2028/index.html"}
    />
  );
}
