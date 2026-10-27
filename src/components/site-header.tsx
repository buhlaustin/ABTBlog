import Link from "next/link";
import { SiteLogo } from "@/components/site-logo";
import { SiteNav } from "@/components/site-nav";
import { siteConfig } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-white/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
      <div className="relative mx-auto flex max-w-5xl items-center justify-between gap-3 px-safe py-3 sm:py-4">
        <Link
          href="/"
          className="min-w-0 shrink transition opacity-90 hover:opacity-100 active:opacity-100"
        >
          <SiteLogo variant="header" />
          <span className="sr-only">{siteConfig.name}</span>
        </Link>
        <SiteNav />
      </div>
    </header>
  );
}
