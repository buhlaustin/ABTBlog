"use client";

import { usePathname } from "next/navigation";
import { workItems } from "@/lib/work-registry";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const hostedWorkPaths = new Set(
  workItems
    .filter((item) => item.kind === "hosted")
    .map((item) => `/work/${item.slug}`),
);

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith("/")) {
    return pathname.slice(0, -1);
  }
  return pathname;
}

function isHostedWorkPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return hostedWorkPaths.has(normalizePathname(pathname));
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const immersive = isHostedWorkPath(pathname);

  if (immersive) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <div className="flex flex-1 flex-col">{children}</div>
      <SiteFooter />
    </>
  );
}
