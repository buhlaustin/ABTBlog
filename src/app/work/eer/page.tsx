import type { Metadata } from "next";
import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";

const item = getWorkItem("eer")!;

export const metadata: Metadata = {
  title: item.title,
  description: item.summary,
};

export default function EerPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/eer/index.html"}
    />
  );
}
