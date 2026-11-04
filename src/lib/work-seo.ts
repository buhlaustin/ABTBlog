import type { WorkItem } from "@/lib/work-registry";
import { pageMetadata } from "@/lib/seo";

export function workPageMetadata(item: WorkItem) {
  return pageMetadata({
    title: item.title,
    description: item.summary,
    path: `/work/${item.slug}/`,
    noIndex: item.status !== "live",
  });
}
