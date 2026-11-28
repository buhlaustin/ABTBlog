import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";
import { workPageMetadata } from "@/lib/work-seo";

const item = getWorkItem("internet-empire")!;

export const metadata = workPageMetadata(item);

export default function InternetEmpirePlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/internet-empire/index.html"}
    />
  );
}