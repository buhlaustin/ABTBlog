import type { Metadata } from "next";
import { HostedWorkFrame } from "@/components/hosted-work-frame";
import { getWorkItem } from "@/lib/work-registry";

const item = getWorkItem("startup-sim")!;

export const metadata: Metadata = {
  title: item.title,
  description: item.summary,
  robots: { index: item.status === "live" },
};

export default function StartupSimPlayPage() {
  return (
    <HostedWorkFrame
      title={item.title}
      entryPath={item.hostedEntry ?? "/play/startup-sim/index.html"}
    />
  );
}
