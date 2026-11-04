import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("startup-sim")!;

export const metadata = workPageMetadata(item);

export default function StartupSimPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/startup-sim/index.html"}
    />
  );
}
